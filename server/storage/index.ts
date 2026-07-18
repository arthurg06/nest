import type { DbSchema } from "../db.js";
import { fileBackend } from "./file.js";
import { postgresBackend } from "./postgres.js";

// A storage backend persists whole-database snapshots. `load` returns null
// when the store has never been written (the caller then seeds it);
// `persist` receives the previous snapshot so row-level backends can write
// only what changed (`prev === null` means full sync).
export interface StorageBackend {
  kind: "file" | "postgres";
  load(): Promise<DbSchema | null>;
  persist(prev: DbSchema | null, next: DbSchema): Promise<void>;
}

// Backend selection is environment-driven so deployments switch storage by
// configuration alone. Tests always use the file backend — they must never
// require network access or cloud credentials.
export function selectBackend(): StorageBackend {
  if (process.env.NODE_ENV === "test") return fileBackend;
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL) return postgresBackend;
  return fileBackend;
}

export function activeStorageKind(): "file" | "postgres" {
  return selectBackend().kind;
}
