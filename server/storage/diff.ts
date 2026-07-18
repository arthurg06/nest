import type { DbSchema } from "../db.js";

// How each collection's records are keyed in row storage. Sessions are keyed
// by their token; processedStripeEvents holds bare strings, so the value IS
// the key (empty string marks that special case).
export const COLLECTION_KEYS: Record<keyof DbSchema, string> = {
  users: "id",
  profiles: "id",
  swipes: "id",
  matches: "id",
  messages: "id",
  plans: "id",
  recommendations: "id",
  events: "id",
  rsvps: "id",
  posts: "id",
  notifications: "id",
  sessions: "token",
  passwordResets: "tokenHash",
  adminAudit: "id",
  processedStripeEvents: "",
};

export const COLLECTIONS = Object.keys(COLLECTION_KEYS) as (keyof DbSchema)[];

export interface RowUpsert {
  collection: keyof DbSchema;
  id: string;
  /** JSON-serialized record (for processedStripeEvents, the JSON string value). */
  data: string;
}

export interface RowDelete {
  collection: keyof DbSchema;
  id: string;
}

export interface StorageChanges {
  upserts: RowUpsert[];
  deletes: RowDelete[];
}

function recordId(collection: keyof DbSchema, record: unknown): string {
  const key = COLLECTION_KEYS[collection];
  if (!key) return String(record);
  return String((record as Record<string, unknown>)[key]);
}

// Row-level diff between two database snapshots. Records are compared by
// serialized value, so untouched rows produce no writes — concurrent
// serverless instances only contend on the rows they actually changed.
export function computeChanges(prev: DbSchema | null, next: DbSchema): StorageChanges {
  const upserts: RowUpsert[] = [];
  const deletes: RowDelete[] = [];

  for (const collection of COLLECTIONS) {
    const prevRecords = prev ? prev[collection] : [];
    const nextRecords = next[collection];

    const prevById = new Map<string, string>();
    for (const record of prevRecords as unknown[]) {
      prevById.set(recordId(collection, record), JSON.stringify(record));
    }

    const seen = new Set<string>();
    for (const record of nextRecords as unknown[]) {
      const id = recordId(collection, record);
      seen.add(id);
      const data = JSON.stringify(record);
      if (prevById.get(id) !== data) {
        upserts.push({ collection, id, data });
      }
    }

    for (const id of prevById.keys()) {
      if (!seen.has(id)) {
        deletes.push({ collection, id });
      }
    }
  }

  return { upserts, deletes };
}
