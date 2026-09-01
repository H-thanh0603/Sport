import { drizzle } from "drizzle-orm/postgres";
import postgres from "postgres";
import * as schema from "./schema";
import { logger } from "@/server/logger";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const maxConnections = Number(process.env.PG_POOL_MAX ?? 20);

const queryClient = postgres(connectionString, {
  max: maxConnections,
  idle_timeout: 20,
  connect_timeout: 10,
  // transient errors retry — DB failover tolerance
  max_lifetime: 60 * 30,
  onnotice: () => {},
});

export const db = drizzle(queryClient, { schema });
export { schema };

export type Database = typeof db;

/** Measure DB latency for observability. */
export async function dbHealthCheck(): Promise<boolean> {
  try {
    await queryClient`SELECT 1`;
    return true;
  } catch (error) {
    logger.error("db health check failed", { error: String(error) });
    return false;
  }
}
