import { sql } from "drizzle-orm";
import { getDb, hasDatabase } from "../../../db";
import { corsHeaders, optionsResponse } from "../cors";

export const dynamic = "force-dynamic";

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function GET(request: Request) {
  if (!(await hasDatabase())) {
    return Response.json({
      ok: true,
      database: "not_configured",
      message: "LeaseKaki is running. Add DATABASE_URL to enable Neon-backed routes.",
    }, { headers: corsHeaders(request) });
  }

  try {
    const db = await getDb();
    await db.execute(sql`select 1`);

    return Response.json({
      ok: true,
      database: "connected",
    }, { headers: corsHeaders(request) });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        database: "error",
        message: error instanceof Error ? error.message : "Unable to connect to Neon.",
      },
      { status: 500, headers: corsHeaders(request) }
    );
  }
}
