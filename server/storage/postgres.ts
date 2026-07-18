import { neon } from "@neondatabase/serverless";
import type { DbSchema } from "../db.js";
import type { StorageBackend } from "./index.js";
import { COLLECTIONS, computeChanges } from "./diff.js";

// Serverless Postgres backend (Neon over HTTP — one stateless fetch per
// query batch, so there is no connection pool to exhaust). Records live as
// one JSONB row per entity in a single table; `seq` preserves insertion
// order so arrays rebuild exactly like the JSON-file document they replace.
//
// A `_meta/initialized` marker row distinguishes "empty but initialized"
// from "never seeded", so the DB_SEED bootstrap runs at most once ever.

const TABLE = "nest_records";
const META_COLLECTION = "_meta";

function connectionString(): string {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("Postgres backend selected without DATABASE_URL");
  return url;
}

type NeonClient = ReturnType<typeof neon>;

let client: NeonClient | null = null;
let clientUrl = "";
let schemaReady: Promise<void> | null = null;

function sql(): NeonClient {
  const url = connectionString();
  if (!client || clientUrl !== url) {
    client = neon(url);
    clientUrl = url;
    schemaReady = null;
  }
  return client;
}

function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = sql()`
      CREATE TABLE IF NOT EXISTS nest_records (
        collection text NOT NULL,
        id text NOT NULL,
        data jsonb NOT NULL,
        seq bigserial,
        PRIMARY KEY (collection, id)
      )
    `.then(() => undefined);
    schemaReady.catch(() => {
      schemaReady = null; // allow retry after transient failures
    });
  }
  return schemaReady;
}

export const postgresBackend: StorageBackend = {
  kind: "postgres",

  async load(): Promise<DbSchema | null> {
    await ensureSchema();
    const rows = (await sql()`
      SELECT collection, id, data FROM nest_records ORDER BY seq ASC
    `) as { collection: string; id: string; data: unknown }[];

    if (rows.length === 0) return null;

    const db = {} as Record<string, unknown[]>;
    for (const collection of COLLECTIONS) db[collection] = [];

    for (const row of rows) {
      if (row.collection === META_COLLECTION) continue;
      const target = db[row.collection];
      if (!target) continue; // unknown collection (forward compatibility)
      if (row.collection === "processedStripeEvents") {
        target.push(row.id);
      } else {
        target.push(row.data);
      }
    }

    return db as unknown as DbSchema;
  },

  async persist(prev: DbSchema | null, next: DbSchema): Promise<void> {
    await ensureSchema();
    const { upserts, deletes } = computeChanges(prev, next);

    const queries = [];
    const s = sql();

    if (prev === null) {
      // Full sync: clear data rows, then write the marker so an empty
      // initialized store is distinguishable from a missing one.
      queries.push(s`DELETE FROM nest_records WHERE collection <> ${META_COLLECTION}`);
      queries.push(s`
        INSERT INTO nest_records (collection, id, data)
        VALUES (${META_COLLECTION}, 'initialized', '{}'::jsonb)
        ON CONFLICT (collection, id) DO NOTHING
      `);
    }

    for (const change of upserts) {
      queries.push(s`
        INSERT INTO nest_records (collection, id, data)
        VALUES (${change.collection}, ${change.id}, ${change.data}::jsonb)
        ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data
      `);
    }

    if (prev !== null) {
      for (const change of deletes) {
        queries.push(s`
          DELETE FROM nest_records
          WHERE collection = ${change.collection} AND id = ${change.id}
        `);
      }
    }

    if (queries.length === 0) return;
    await s.transaction(queries);
  },
};
