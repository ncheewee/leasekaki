import { sql } from "drizzle-orm";
import { getDb, hasDatabase } from "../../../db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasDatabase())) {
    return Response.json({
      ok: true,
      database: "not_configured",
      message: "LeaseKaki is running. Add DATABASE_URL to enable Neon-backed routes.",
    });
  }

  try {
    const db = await getDb();
    await db.execute(sql`select 1`);

    return Response.json({
      ok: true,
      database: "connected",
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        database: "error",
        message: error instanceof Error ? error.message : "Unable to connect to Neon.",
      },
      { status: 500 }
    );
  }
}
