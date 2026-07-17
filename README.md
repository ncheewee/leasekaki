# LeaseKaki

Mobile-first Singapore rental marketplace prototype: snap a property, generate a listing draft, support tenant follow-through, and prepare the transaction lane for paperwork.

## Stack

- Next/Vinext app for Cloudflare Workers-compatible deployment
- Drizzle ORM
- Neon Postgres via `@neondatabase/serverless`
- Sites hosting

## Local Development

```bash
npm install
npm run dev
npm run build
```

The UI prototype runs without a database. Backend routes return a clear configuration message until `DATABASE_URL` is set.

## Neon Setup

Create a Neon project, copy the pooled or direct Postgres connection string, then set:

```bash
cp .env.example .env
```

Add your real value:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
```

Generate migrations after schema edits:

```bash
npm run db:generate
```

Apply migrations to Neon:

```bash
npm run db:migrate
```

For hosted Sites deployments, add `DATABASE_URL` as a production runtime environment variable in Sites before deploying the version that should use Neon.

## Backend Routes

- `GET /api/health`: confirms app status and Neon connectivity when configured.
- `GET /api/listings`: returns the latest 50 persisted listings from Neon.
- `POST /api/listings`: creates a listing draft or published listing.

Minimal `POST /api/listings` payload:

```json
{
  "title": "Bright 4-room near Bishan MRT",
  "description": "Bright, breezy home with an efficient layout.",
  "kind": "hdb_whole_unit",
  "listerKind": "owner",
  "status": "draft",
  "estate": "Bishan",
  "addressHint": "Bishan Street 13",
  "bedrooms": "3 bed",
  "furnishing": "Furnished",
  "availableFrom": "2026-09-01",
  "askingRent": 3750
}
```

Valid listing kinds: `hdb_whole_unit`, `hdb_room`, `private_whole_unit`, `private_room`.

Valid lister kinds: `owner`, `agent`.

Valid statuses: `draft`, `published`, `archived`.
