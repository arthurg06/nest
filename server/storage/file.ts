import fs from "fs";
import path from "path";
import type { DbSchema } from "../db.js";
import type { StorageBackend } from "./index.js";

// JSON-file backend: the historical storage model, still the right choice for
// local development, tests, and self-hosted installs. The whole document is
// written atomically (temp file + rename).
function dbFile(): string {
  return (
    process.env.DB_PATH ||
    (process.env.VERCEL ? "/tmp/db.json" : path.join(process.cwd(), "db.json"))
  );
}

export const fileBackend: StorageBackend = {
  kind: "file",

  async load(): Promise<DbSchema | null> {
    const file = dbFile();
    if (!fs.existsSync(file)) return null;
    try {
      return JSON.parse(fs.readFileSync(file, "utf-8")) as DbSchema;
    } catch (error) {
      console.error("Could not parse database file — treating it as empty:", error);
      return null;
    }
  },

  async persist(_prev: DbSchema | null, next: DbSchema): Promise<void> {
    const file = dbFile();
    const tempFile = `${file}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(next, null, 2), "utf-8");
    fs.renameSync(tempFile, file);
  },
};
