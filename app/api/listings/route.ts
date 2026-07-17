import { desc } from "drizzle-orm";
import { getDb, hasDatabase } from "../../../db";
import { listings, type NewListing } from "../../../db/schema";
import { corsHeaders, optionsResponse } from "../cors";

export const dynamic = "force-dynamic";

type ListingPayload = Record<string, unknown>;

const listingKinds = ["hdb_whole_unit", "hdb_room", "private_whole_unit", "private_room"] as const;
const listerKinds = ["owner", "agent"] as const;
const listingStatuses = ["draft", "published", "archived"] as const;

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

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function GET(request: Request) {
  if (!(await hasDatabase())) {
    return Response.json(
      {
        error: "DATABASE_URL is not configured.",
      },
      { status: 503, headers: corsHeaders(request) }
    );
  }

  const db = await getDb();
  const rows = await db.select().from(listings).orderBy(desc(listings.createdAt)).limit(50);
  return Response.json({ listings: rows }, { headers: corsHeaders(request) });
}

export async function POST(request: Request) {
  if (!(await hasDatabase())) {
    return Response.json(
      {
        error: "DATABASE_URL is not configured.",
      },
      { status: 503, headers: corsHeaders(request) }
    );
  }

  try {
    const payload = (await request.json()) as ListingPayload;
    const values = parseListing(payload);
    const db = await getDb();
    const [created] = await db.insert(listings).values(values).returning();

    return Response.json({ listing: created }, { status: 201, headers: corsHeaders(request) });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unable to create listing.",
      },
      { status: 400, headers: corsHeaders(request) }
    );
  }
}
