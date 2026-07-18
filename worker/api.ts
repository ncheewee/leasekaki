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
  ONEMAP_EMAIL?: string;
  ONEMAP_PASSWORD?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  APPLE_CLIENT_ID?: string;
  APPLE_TEAM_ID?: string;
  APPLE_KEY_ID?: string;
  APPLE_PRIVATE_KEY?: string;
  AUTH_SESSION_SECRET?: string;
  AUTH_REDIRECT_ORIGIN?: string;
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
    "Access-Control-Allow-Headers": "Authorization,Content-Type",
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

function base64UrlEncode(value: string | ArrayBuffer | Uint8Array) {
  const bytes = typeof value === "string"
    ? new TextEncoder().encode(value)
    : value instanceof Uint8Array
      ? value
      : new Uint8Array(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function decodeJsonTokenPart<T = Record<string, unknown>>(value: string): T {
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(value))) as T;
}

async function hmacSha256(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  return crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
}

function getAuthSecret(env: Env) {
  if (!env.AUTH_SESSION_SECRET || env.AUTH_SESSION_SECRET.length < 24) {
    throw new Error("AUTH_SESSION_SECRET is not configured.");
  }
  return env.AUTH_SESSION_SECRET;
}

async function signToken(payload: Record<string, unknown>, secret: string) {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const unsigned = `${header}.${body}`;
  const signature = base64UrlEncode(await hmacSha256(secret, unsigned));
  return `${unsigned}.${signature}`;
}

async function verifyToken<T = Record<string, unknown>>(token: string, secret: string): Promise<T> {
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) throw new Error("Invalid token.");
  const expected = base64UrlEncode(await hmacSha256(secret, `${header}.${body}`));
  if (signature !== expected) throw new Error("Invalid token signature.");
  const payload = decodeJsonTokenPart<T>(body);
  const exp = Number((payload as Record<string, unknown>).exp ?? 0);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) throw new Error("Token expired.");
  return payload;
}

function frontendUrl(env: Env, fallbackPath = "") {
  const configured = env.AUTH_REDIRECT_ORIGIN || "https://ncheewee.github.io/leasekaki/";
  const url = new URL(configured);
  if (fallbackPath) url.pathname = fallbackPath;
  return url;
}

function authCallbackUrl(request: Request, provider: "google" | "apple") {
  const url = new URL(request.url);
  url.pathname = `/api/auth/${provider}/callback`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

function authRedirect(env: Env, params: Record<string, string>) {
  const next = frontendUrl(env);
  const hash = new URLSearchParams(params).toString();
  next.hash = hash;
  return Response.redirect(next.toString(), 302);
}

async function createAuthState(env: Env, provider: "google" | "apple", next = "/leasekaki/") {
  const now = Math.floor(Date.now() / 1000);
  return signToken({
    type: "oauth_state",
    provider,
    next,
    nonce: crypto.randomUUID(),
    iat: now,
    exp: now + 10 * 60,
  }, getAuthSecret(env));
}

async function verifyAuthState(env: Env, state: string, provider: "google" | "apple") {
  const payload = await verifyToken<Record<string, unknown>>(state, getAuthSecret(env));
  if (payload.type !== "oauth_state" || payload.provider !== provider) throw new Error("Invalid auth state.");
  return payload;
}

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

function normalizeAuthUser(provider: "google" | "apple", claims: Record<string, unknown>) {
  const email = typeof claims.email === "string" ? claims.email : "";
  const name = typeof claims.name === "string"
    ? claims.name
    : typeof claims.given_name === "string"
      ? `${claims.given_name}${typeof claims.family_name === "string" ? ` ${claims.family_name}` : ""}`.trim()
      : email.split("@")[0] || "LeaseKaki user";
  return {
    provider,
    id: String(claims.sub || ""),
    email,
    name,
    picture: typeof claims.picture === "string" ? claims.picture : "",
  };
}

async function createSession(env: Env, provider: "google" | "apple", claims: Record<string, unknown>) {
  const user = normalizeAuthUser(provider, claims);
  if (!user.id || !user.email) throw new Error("Identity provider did not return a usable email.");
  const now = Math.floor(Date.now() / 1000);
  const token = await signToken({
    iss: "leasekaki",
    type: "session",
    ...user,
    iat: now,
    exp: now + 7 * 24 * 60 * 60,
  }, getAuthSecret(env));
  return { token, user };
}

async function handleAuthStart(request: Request, env: Env, provider: "google" | "apple") {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") || "/leasekaki/";
  if (!env.AUTH_SESSION_SECRET || env.AUTH_SESSION_SECRET.length < 24) {
    return authRedirect(env, { auth_error: "Sign-in is not configured yet." });
  }
  const state = await createAuthState(env, provider, next);

  if (provider === "google") {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return authRedirect(env, { auth_error: "Google sign-in is not configured yet." });
    }
    const google = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    google.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
    google.searchParams.set("redirect_uri", authCallbackUrl(request, "google"));
    google.searchParams.set("response_type", "code");
    google.searchParams.set("scope", "openid email profile");
    google.searchParams.set("state", state);
    google.searchParams.set("nonce", crypto.randomUUID());
    return Response.redirect(google.toString(), 302);
  }

  if (!env.APPLE_CLIENT_ID || !env.APPLE_TEAM_ID || !env.APPLE_KEY_ID || !env.APPLE_PRIVATE_KEY) {
    return authRedirect(env, { auth_error: "Apple sign-in is not configured yet." });
  }
  const apple = new URL("https://appleid.apple.com/auth/authorize");
  apple.searchParams.set("client_id", env.APPLE_CLIENT_ID);
  apple.searchParams.set("redirect_uri", authCallbackUrl(request, "apple"));
  apple.searchParams.set("response_type", "code id_token");
  apple.searchParams.set("response_mode", "form_post");
  apple.searchParams.set("scope", "name email");
  apple.searchParams.set("state", state);
  apple.searchParams.set("nonce", crypto.randomUUID());
  return Response.redirect(apple.toString(), 302);
}

async function handleGoogleCallback(request: Request, env: Env) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  if (error) return authRedirect(env, { auth_error: error });

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) throw new Error("Google callback is missing code or state.");
  await verifyAuthState(env, state, "google");
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) throw new Error("Google sign-in is not configured.");

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: authCallbackUrl(request, "google"),
      grant_type: "authorization_code",
    }),
  });
  const tokenBody = (await tokenResponse.json().catch(() => ({}))) as { id_token?: string; error_description?: string; error?: string };
  if (!tokenResponse.ok || !tokenBody.id_token) {
    throw new Error(tokenBody.error_description || tokenBody.error || `Google token exchange returned ${tokenResponse.status}.`);
  }

  const verifyUrl = new URL("https://oauth2.googleapis.com/tokeninfo");
  verifyUrl.searchParams.set("id_token", tokenBody.id_token);
  const verifyResponse = await fetch(verifyUrl);
  const claims = (await verifyResponse.json().catch(() => ({}))) as Record<string, unknown>;
  if (!verifyResponse.ok || claims.aud !== env.GOOGLE_CLIENT_ID || claims.iss !== "https://accounts.google.com") {
    throw new Error("Google identity token could not be verified.");
  }

  const session = await createSession(env, "google", claims);
  return authRedirect(env, { leasekaki_auth: session.token });
}

function pemToArrayBuffer(pem: string) {
  const clean = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  return base64UrlDecode(clean.replace(/\+/g, "-").replace(/\//g, "_")).buffer;
}

async function createAppleClientSecret(env: Env) {
  if (!env.APPLE_CLIENT_ID || !env.APPLE_TEAM_ID || !env.APPLE_KEY_ID || !env.APPLE_PRIVATE_KEY) {
    throw new Error("Apple sign-in is not configured.");
  }
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "ES256", kid: env.APPLE_KEY_ID }));
  const body = base64UrlEncode(JSON.stringify({
    iss: env.APPLE_TEAM_ID,
    iat: now,
    exp: now + 60 * 60 * 24 * 30,
    aud: "https://appleid.apple.com",
    sub: env.APPLE_CLIENT_ID,
  }));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(env.APPLE_PRIVATE_KEY),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(`${header}.${body}`));
  return `${header}.${body}.${base64UrlEncode(signature)}`;
}

async function handleAppleCallback(request: Request, env: Env) {
  const form = request.method === "POST" ? await request.formData() : null;
  const url = new URL(request.url);
  const getValue = (key: string) => String(form?.get(key) || url.searchParams.get(key) || "");
  const error = getValue("error");
  if (error) return authRedirect(env, { auth_error: error });

  const code = getValue("code");
  const state = getValue("state");
  if (!code || !state) throw new Error("Apple callback is missing code or state.");
  await verifyAuthState(env, state, "apple");
  if (!env.APPLE_CLIENT_ID) throw new Error("Apple sign-in is not configured.");

  const tokenResponse = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.APPLE_CLIENT_ID,
      client_secret: await createAppleClientSecret(env),
      code,
      grant_type: "authorization_code",
      redirect_uri: authCallbackUrl(request, "apple"),
    }),
  });
  const tokenBody = (await tokenResponse.json().catch(() => ({}))) as { id_token?: string; error_description?: string; error?: string };
  if (!tokenResponse.ok || !tokenBody.id_token) {
    throw new Error(tokenBody.error_description || tokenBody.error || `Apple token exchange returned ${tokenResponse.status}.`);
  }

  const claims = decodeJsonTokenPart<Record<string, unknown>>(tokenBody.id_token.split(".")[1] || "");
  const exp = Number(claims.exp ?? 0);
  if (claims.aud !== env.APPLE_CLIENT_ID || claims.iss !== "https://appleid.apple.com" || exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Apple identity token could not be verified.");
  }

  const session = await createSession(env, "apple", claims);
  return authRedirect(env, { leasekaki_auth: session.token });
}

async function handleAuthMe(request: Request, env: Env) {
  const token = getBearerToken(request);
  if (!token) return json(request, env, { user: null });
  const payload = await verifyToken<Record<string, unknown>>(token, getAuthSecret(env));
  if (payload.type !== "session") throw new Error("Invalid session token.");
  return json(request, env, {
    user: {
      provider: payload.provider,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    },
  });
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

async function fetchOneMapToken(env: Env) {
  if (!env.ONEMAP_EMAIL || !env.ONEMAP_PASSWORD) {
    throw new Error("OneMap credentials are not configured.");
  }

  const response = await fetch("https://www.onemap.gov.sg/api/auth/post/getToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: env.ONEMAP_EMAIL,
      password: env.ONEMAP_PASSWORD,
    }),
  });

  const body = (await response.json().catch(() => ({}))) as { access_token?: string; error?: string };
  if (!response.ok || !body.access_token) {
    throw new Error(body.error || `OneMap authentication returned ${response.status}.`);
  }

  return body.access_token;
}

async function searchOneMapPostal(postal: string, token: string) {
  const oneMapUrl = new URL("https://www.onemap.gov.sg/api/common/elastic/search");
  oneMapUrl.searchParams.set("searchVal", postal);
  oneMapUrl.searchParams.set("returnGeom", "Y");
  oneMapUrl.searchParams.set("getAddrDetails", "Y");
  oneMapUrl.searchParams.set("pageNum", "1");

  const response = await fetch(oneMapUrl, {
    headers: { Authorization: token },
  });

  return {
    response,
    body: (await response.json().catch(() => ({}))) as { results?: Array<Record<string, string>>; error?: string },
  };
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

  if (!env.ONEMAP_TOKEN && (!env.ONEMAP_EMAIL || !env.ONEMAP_PASSWORD)) {
    return json(request, env, { error: "OneMap token or credentials are not configured.", code: "not_configured" }, { status: 503 });
  }

  let token = env.ONEMAP_TOKEN || await fetchOneMapToken(env);
  let { response, body } = await searchOneMapPostal(postal, token);

  if ((response.status === 401 || response.status === 403) && env.ONEMAP_EMAIL && env.ONEMAP_PASSWORD) {
    token = await fetchOneMapToken(env);
    ({ response, body } = await searchOneMapPostal(postal, token));
  }

  if (!response.ok) {
    return json(request, env, { error: body.error || `OneMap returned ${response.status}.`, code: "onemap_error" }, { status: response.status === 404 ? 404 : 502 });
  }

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
          oneMapConfigured: Boolean(env.ONEMAP_TOKEN || (env.ONEMAP_EMAIL && env.ONEMAP_PASSWORD)),
          oneMapAutoRefreshConfigured: Boolean(env.ONEMAP_EMAIL && env.ONEMAP_PASSWORD),
          authConfigured: Boolean(env.AUTH_SESSION_SECRET),
          googleSsoConfigured: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
          appleSsoConfigured: Boolean(env.APPLE_CLIENT_ID && env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY),
        });
      }

      if (url.pathname === "/api/auth/me") {
        return handleAuthMe(request, env);
      }

      if (url.pathname === "/api/auth/google/start") {
        return handleAuthStart(request, env, "google");
      }

      if (url.pathname === "/api/auth/apple/start") {
        return handleAuthStart(request, env, "apple");
      }

      if (url.pathname === "/api/auth/google/callback") {
        return handleGoogleCallback(request, env);
      }

      if (url.pathname === "/api/auth/apple/callback") {
        return handleAppleCallback(request, env);
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
