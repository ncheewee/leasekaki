import { integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const listingKindEnum = pgEnum("listing_kind", [
  "hdb_whole_unit",
  "hdb_room",
  "private_whole_unit",
  "private_room",
]);

export const listerKindEnum = pgEnum("lister_kind", ["owner", "agent"]);

export const listingStatusEnum = pgEnum("listing_status", ["draft", "published", "archived"]);

export const listings = pgTable("listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  kind: listingKindEnum("kind").notNull(),
  listerKind: listerKindEnum("lister_kind").notNull().default("owner"),
  status: listingStatusEnum("status").notNull().default("draft"),
  estate: text("estate").notNull(),
  addressHint: text("address_hint").notNull(),
  exactUnit: text("exact_unit"),
  bedrooms: text("bedrooms").notNull(),
  furnishing: text("furnishing").notNull(),
  availableFrom: text("available_from").notNull(),
  askingRent: integer("asking_rent").notNull(),
  suggestedRentMin: integer("suggested_rent_min"),
  suggestedRentMax: integer("suggested_rent_max"),
  rentEvidence: jsonb("rent_evidence").$type<{
    confidence: "low" | "medium" | "high";
    notes: string[];
    comparables: { label: string; rent: number }[];
  }>(),
  photoUrls: jsonb("photo_urls").$type<string[]>().notNull().default([]),
  createdByEmail: text("created_by_email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
