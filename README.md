# LeaseKaki

Mobile-first Singapore rental marketplace prototype: snap a property, generate a listing draft, support tenant follow-through, and prepare the transaction lane for paperwork.

## Stack

- Next/Vinext app for Cloudflare Workers-compatible deployment
- Drizzle ORM
- Neon Postgres via `@neondatabase/serverless`
- GitHub Pages frontend
- Cloudflare Worker API
- ImageKit image upload auth endpoint
- OneMap postal-code lookup via the Worker API

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

For Cloudflare Worker API deployments, store `DATABASE_URL` as a Worker secret.

```bash
npx wrangler secret put DATABASE_URL --config wrangler.api.toml
```

## Cloudflare API Setup

Deploy the standalone API Worker:

```bash
npx wrangler deploy --config wrangler.api.toml
```

Then update `docs/index.html` so `API_BASE` points at the deployed Worker URL.

## OneMap Postal Code Setup

LeaseKaki keeps OneMap credentials out of the public GitHub Pages frontend. The frontend calls the Cloudflare Worker instead:

```text
GET /api/postal?postal=569788
```

Store either a temporary OneMap token, or the OneMap email/password pair for automatic token refresh, then redeploy:

```bash
npx wrangler secret put ONEMAP_TOKEN --config wrangler.api.toml
npx wrangler secret put ONEMAP_EMAIL --config wrangler.api.toml
npx wrangler secret put ONEMAP_PASSWORD --config wrangler.api.toml
npx wrangler deploy --config wrangler.api.toml
```

OneMap tokens expire periodically. If `ONEMAP_EMAIL` and `ONEMAP_PASSWORD` are configured, the Worker can generate a fresh token and retry postal lookups when the temporary token expires.

## ImageKit Setup

ImageKit is a good fit for the MVP because browser uploads can go directly to ImageKit while LeaseKaki only returns one-time upload credentials from the Worker.

Add these Worker secrets:

```bash
npx wrangler secret put IMAGEKIT_PRIVATE_KEY --config wrangler.api.toml
npx wrangler secret put IMAGEKIT_PUBLIC_KEY --config wrangler.api.toml
npx wrangler secret put IMAGEKIT_URL_ENDPOINT --config wrangler.api.toml
```

The frontend should call `GET /api/imagekit-auth` before uploading. The private key must never be placed in `docs/index.html`.

## Backend Routes

- `GET /api/health`: confirms app status and Neon connectivity when configured.
- `GET /api/listings`: returns the latest 50 persisted listings from Neon.
- `POST /api/listings`: creates a listing draft or published listing.
- `GET /api/imagekit-auth`: returns one-time ImageKit upload parameters for browser uploads.
- `GET /api/postal?postal=569788`: resolves a 6-digit Singapore postal code through OneMap.

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
