import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed listings.");
}

const sql = neon(databaseUrl);

const listings = [
  {
    title: "Sunny 4-room near Bishan MRT",
    description: "Bright, breezy home with an efficient layout, updated kitchen and a sheltered walk to Bishan MRT.",
    kind: "hdb_whole_unit",
    listerKind: "owner",
    estate: "Bishan",
    addressHint: "Bishan Street 13",
    bedrooms: "3 bed",
    furnishing: "Furnished",
    availableFrom: "2026-09-01",
    askingRent: 3750,
    suggestedRentMin: 3550,
    suggestedRentMax: 3900,
  },
  {
    title: "Calm common room in Tiong Bahru",
    description: "A quiet, furnished room in an owner-occupied home near cafes, buses and Tiong Bahru Market.",
    kind: "hdb_room",
    listerKind: "owner",
    estate: "Tiong Bahru",
    addressHint: "Tiong Bahru Road",
    bedrooms: "Common room",
    furnishing: "Furnished",
    availableFrom: "2026-07-25",
    askingRent: 1350,
    suggestedRentMin: 1250,
    suggestedRentMax: 1450,
  },
  {
    title: "City-view 2-bed at Paya Lebar",
    description: "High-floor private apartment with city views, full facilities and direct access to transport and retail.",
    kind: "private_whole_unit",
    listerKind: "agent",
    estate: "Paya Lebar",
    addressHint: "Paya Lebar Quarter",
    bedrooms: "2 bed",
    furnishing: "2 bath",
    availableFrom: "2026-08-15",
    askingRent: 4300,
    suggestedRentMin: 4100,
    suggestedRentMax: 4550,
  },
  {
    title: "Family 5-room beside Clementi Mall",
    description: "Generous family home with a practical study corner and excellent access to schools, shops and Clementi MRT.",
    kind: "hdb_whole_unit",
    listerKind: "agent",
    estate: "Clementi",
    addressHint: "Clementi Avenue 3",
    bedrooms: "3 bed",
    furnishing: "Part-furnished",
    availableFrom: "2026-10-01",
    askingRent: 4050,
    suggestedRentMin: 3850,
    suggestedRentMax: 4200,
  },
  {
    title: "High-floor room near Queenstown MRT",
    description: "Bright common room in a tidy flat with easy access to Queenstown MRT and Alexandra offices.",
    kind: "hdb_room",
    listerKind: "owner",
    estate: "Queenstown",
    addressHint: "Stirling Road",
    bedrooms: "Common room",
    furnishing: "Furnished",
    availableFrom: "2026-08-01",
    askingRent: 1550,
    suggestedRentMin: 1450,
    suggestedRentMax: 1650,
  },
  {
    title: "Pet-friendly studio at River Valley",
    description: "Compact private studio with balcony access, condo facilities and a flexible pet-friendly owner.",
    kind: "private_whole_unit",
    listerKind: "agent",
    estate: "River Valley",
    addressHint: "River Valley Close",
    bedrooms: "Studio",
    furnishing: "1 bath",
    availableFrom: "2026-08-20",
    askingRent: 3200,
    suggestedRentMin: 3050,
    suggestedRentMax: 3400,
  },
  {
    title: "Renovated 5-room near Tampines Hub",
    description: "Recently refreshed HDB home with a large living area, useful storage and quick access to Tampines Hub.",
    kind: "hdb_whole_unit",
    listerKind: "owner",
    estate: "Tampines",
    addressHint: "Tampines Street 82",
    bedrooms: "3 bed",
    furnishing: "Part-furnished",
    availableFrom: "2026-09-01",
    askingRent: 4200,
    suggestedRentMin: 3950,
    suggestedRentMax: 4300,
  },
  {
    title: "Master room beside Buona Vista",
    description: "Ensuite master room with desk setup, fast commute to one-north and easy access to food options.",
    kind: "private_room",
    listerKind: "agent",
    estate: "Buona Vista",
    addressHint: "North Buona Vista Road",
    bedrooms: "Master room",
    furnishing: "Ensuite",
    availableFrom: "2026-07-25",
    askingRent: 1850,
    suggestedRentMin: 1750,
    suggestedRentMax: 2000,
  },
  {
    title: "Quiet 3-bed family condo in Serangoon",
    description: "A calm family-sized condo unit with facilities, sheltered parking and quick access to Serangoon MRT.",
    kind: "private_whole_unit",
    listerKind: "owner",
    estate: "Serangoon",
    addressHint: "Serangoon Avenue 3",
    bedrooms: "3 bed",
    furnishing: "2 bath",
    availableFrom: "2026-09-15",
    askingRent: 5200,
    suggestedRentMin: 4950,
    suggestedRentMax: 5450,
  },
  {
    title: "Whole unit minutes from Jurong East",
    description: "Convenient whole HDB unit near Jurong East transport, malls and business park access.",
    kind: "hdb_whole_unit",
    listerKind: "agent",
    estate: "Jurong East",
    addressHint: "Jurong East Street 21",
    bedrooms: "3 bed",
    furnishing: "Furnished",
    availableFrom: "2026-10-01",
    askingRent: 3900,
    suggestedRentMin: 3700,
    suggestedRentMax: 4050,
  },
];

await sql`delete from listings`;

for (const item of listings) {
  await sql`
    insert into listings (
      title,
      description,
      kind,
      lister_kind,
      status,
      estate,
      address_hint,
      bedrooms,
      furnishing,
      available_from,
      asking_rent,
      suggested_rent_min,
      suggested_rent_max,
      rent_evidence,
      photo_urls
    )
    values (
      ${item.title},
      ${item.description},
      ${item.kind},
      ${item.listerKind},
      'published',
      ${item.estate},
      ${item.addressHint},
      ${item.bedrooms},
      ${item.furnishing},
      ${item.availableFrom},
      ${item.askingRent},
      ${item.suggestedRentMin},
      ${item.suggestedRentMax},
      ${JSON.stringify({
        confidence: "medium",
        notes: ["Prototype seed data", "Rent range is illustrative"],
        comparables: [
          { label: `${item.estate} lower guide`, rent: item.suggestedRentMin },
          { label: `${item.estate} upper guide`, rent: item.suggestedRentMax },
        ],
      })}::jsonb,
      '[]'::jsonb
    )
  `;
}

const [result] = await sql`select count(*)::int as count from listings`;
console.log(`Seeded ${result.count} listings.`);
