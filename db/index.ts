import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type WorkerEnv = {
  DATABASE_URL?: string;
};

async function getWorkerDatabaseUrl() {
  try {
    const workerModule = (await import("cloudflare:workers")) as { env?: WorkerEnv };
    return workerModule.env?.DATABASE_URL;
  } catch {
    return undefined;
  }
}

async function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? (await getWorkerDatabaseUrl());
}

export async function hasDatabase() {
  return Boolean(await getDatabaseUrl());
}

export async function getDb() {
  const databaseUrl = await getDatabaseUrl();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured. Add a Neon Postgres connection string before using backend routes.");
  }

  const client = neon(databaseUrl);
  return drizzle({ client, schema });
}
