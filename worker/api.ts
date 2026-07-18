import { desc } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { listings, type NewListing } from "../db/schema";
import * as schema from "../db/schema";

type Env = {
  DATABASE_URL?: string;
  ALLOWED_ORIGIN?: string;
  IMAGEKIT_PRIVATE_KEY?: string;
  IMAGEKIT_PUBLIC_KEY?: string;
  IMAGEKIT_URL_ENDPOINT?: string;
  ONEMAP_TOKEN?: string;
};

type ListingPayload = Record<string, unknown>;

const listingKinds = ["hdb_whole_unit", "hdb_room", "private_whole_unit", "private_room"] as const;
const listerKinds = ["owner", "agent"] as const;
const listingStatuses = ["draft", "published", "archived"] as const;

const defaultAllowedOrigins = new Set([
  "https://ncheewee.github.io",
  "http://localhost:3000",
  "http://localhost:4173",
]);

function corsHeaders(request: Request, env: Env) {
  const origin = request.headers.get("origin");
  const envOrigins = (env.ALLOWED_ORIGIN ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allowedOrigins = new Set([...defaultAllowedOrigins, ...envOrigins]);
  const allowOrigin = origin && allowedOrigins.has(origin) ? origin : "https://ncheewee.github.io";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(request: Request, env: Env, body: unknown, init: ResponseInit = {}) {
  return Response.json(body, {
    ...init,
    headers: {
      ...corsHeaders(request, env),
      ...init.headers,
    },
  });
}

function getDb(env: Env) {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return drizzle({ client: neon(env.DATABASE_URL), schema });
}

function getString(payload: ListingPayload, key: string) {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getNumber(payload: ListingPayload, key: string) {
  const value = payload[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function getStringArray(payload: ListingPayload, key: string) {
  const value = payload[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function getEnumValue<T extends readonly string[]>(value: string | null, validValues: T, fallback?: T[number]) {
  if (!value) return fallback ?? null;
  return validValues.includes(value) ? value : null;
}

function parseListing(payload: ListingPayload): NewListing {
  const title = getString(payload, "title");
  const description = getString(payload, "description");
  const kind = getString(payload, "kind");
  const estate = getString(payload, "estate");
  const addressHint = getString(payload, "addressHint");
  const bedrooms = getString(payload, "bedrooms");
  const furnishing = getString(payload, "furnishing");
  const availableFrom = getString(payload, "availableFrom");
  const askingRent = getNumber(payload, "askingRent");

  if (!title || !description || !kind || !estate || !addressHint || !bedrooms || !furnishing || !availableFrom || askingRent === null) {
    throw new Error("Missing required listing fields.");
  }

  const listingKind = getEnumValue(kind, listingKinds);
  const listerKind = getEnumValue(getString(payload, "listerKind"), listerKinds, "owner");
  const status = getEnumValue(getString(payload, "status"), listingStatuses, "draft");

  if (!listingKind || !listerKind || !status) {
    throw new Error("Invalid listing kind, lister kind, or status.");
  }

  return {
    title,
    description,
    kind: listingKind as NewListing["kind"],
    listerKind: listerKind as NewListing["listerKind"],
    status: status as NewListing["status"],
    estate,
    addressHint,
    exactUnit: getString(payload, "exactUnit"),
    bedrooms,
    furnishing,
    availableFrom,
    askingRent,
    suggestedRentMin: getNumber(payload, "suggestedRentMin"),
    suggestedRentMax: getNumber(payload, "suggestedRentMax"),
    photoUrls: getStringArray(payload, "photoUrls"),
    createdByEmail: getString(payload, "createdByEmail"),
  };
}

function bytesToHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function signImageKitUpload(env: Env) {
  if (!env.IMAGEKIT_PRIVATE_KEY || !env.IMAGEKIT_PUBLIC_KEY || !env.IMAGEKIT_URL_ENDPOINT) {
    throw new Error("ImageKit keys are not configured.");
  }

  const token = crypto.randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 20 * 60;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(env.IMAGEKIT_PRIVATE_KEY),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = bytesToHex(await crypto.subtle.sign("HMAC", key, encoder.encode(`${token}${expire}`)));

  return {
    token,
    expire,
    signature,
    publicKey: env.IMAGEKIT_PUBLIC_KEY,
    urlEndpoint: env.IMAGEKIT_URL_ENDPOINT,
  };
}

async function handleListings(request: Request, env: Env) {
  const db = getDb(env);

  if (request.method === "GET") {
    const rows = await db.select().from(listings).orderBy(desc(listings.createdAt)).limit(50);
    return json(request, env, { listings: rows });
  }

  if (request.method === "POST") {
    const payload = (await request.json()) as ListingPayload;
    const values = parseListing(payload);
    const [created] = await db.insert(listings).values(values).returning();
    return json(request, env, { listing: created }, { status: 201 });
  }

  return json(request, env, { error: "Method not allowed." }, { status: 405 });
}

async function handlePostalLookup(request: Request, env: Env) {
  if (request.method !== "GET") {
    return json(request, env, { error: "Method not allowed." }, { status: 405 });
  }

  const url = new URL(request.url);
  const postal = (url.searchParams.get("postal") ?? "").trim();
  if (!/^\d{6}$/.test(postal)) {
    return json(request, env, { error: "Postal code must be 6 digits.", code: "invalid_postal" }, { status: 400 });
  }

  if (!env.ONEMAP_TOKEN) {
    return json(request, env, { error: "ONEMAP_TOKEN is not configured.", code: "not_configured" }, { status: 503 });
  }

  const oneMapUrl = new URL("https://www.onemap.gov.sg/api/common/elastic/search");
  oneMapUrl.searchParams.set("searchVal", postal);
  oneMapUrl.searchParams.set("returnGeom", "Y");
  oneMapUrl.searchParams.set("getAddrDetails", "Y");
  oneMapUrl.searchParams.set("pageNum", "1");

  const response = await fetch(oneMapUrl, {
    headers: { Authorization: env.ONEMAP_TOKEN },
  });

  if (!response.ok) {
    return json(request, env, { error: `OneMap returned ${response.status}.`, code: "onemap_error" }, { status: response.status === 404 ? 404 : 502 });
  }

  const body = (await response.json()) as { results?: Array<Record<string, string>> };
  const result = body.results?.find((entry) => String(entry.POSTAL) === postal) ?? body.results?.[0];
  if (!result) {
    return json(request, env, { error: "Postal code not found.", code: "not_found", postal }, { status: 404 });
  }

  return json(request, env, {
    postal,
    address: result.ADDRESS || result.SEARCHVAL || `Singapore ${postal}`,
    block: result.BLK_NO || "",
    road: result.ROAD_NAME || "",
    building: result.BUILDING || "",
    lat: Number(result.LATITUDE),
    lng: Number(result.LONGITUDE || result.LONGTITUDE),
    source: "OneMap",
  });
}

const apiWorker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === "/api/health") {
        return json(request, env, {
          ok: true,
          service: "leasekaki-api",
          databaseConfigured: Boolean(env.DATABASE_URL),
          imageKitConfigured: Boolean(env.IMAGEKIT_PRIVATE_KEY && env.IMAGEKIT_PUBLIC_KEY && env.IMAGEKIT_URL_ENDPOINT),
          oneMapConfigured: Boolean(env.ONEMAP_TOKEN),
        });
      }

      if (url.pathname === "/api/listings") {
        return handleListings(request, env);
      }

      if (url.pathname === "/api/imagekit-auth") {
        return json(request, env, await signImageKitUpload(env));
      }

      if (url.pathname === "/api/postal") {
        return handlePostalLookup(request, env);
      }

      return json(request, env, { error: "Not found." }, { status: 404 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected API error.";
      const status = message.includes("not configured") ? 503 : 400;
      return json(request, env, { error: message }, { status });
    }
  },
};

export default apiWorker;
