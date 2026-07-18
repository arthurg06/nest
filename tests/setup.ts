import fs from "fs";
import os from "os";
import path from "path";

// Point the server at throwaway storage BEFORE the app module is imported.
const tag = `nest-test-${process.pid}-${Math.random().toString(36).slice(2, 10)}`;

process.env.NODE_ENV = "test";
process.env.DB_PATH = path.join(os.tmpdir(), `${tag}-db.json`);
process.env.UPLOAD_DIR = path.join(os.tmpdir(), `${tag}-uploads`);
// Deterministic admin bootstrap for authorization tests.
process.env.ADMIN_EMAILS = "admin@nest.test";

for (const p of [process.env.DB_PATH!, process.env.UPLOAD_DIR!]) {
  fs.rmSync(p, { recursive: true, force: true });
}
