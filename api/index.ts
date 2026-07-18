// Explicit .js extension: at runtime Vercel's ESM resolver must not confuse
// the compiled server.ts with the server/ directory (directory imports are
// unsupported in Node ESM). TS maps .js → .ts at build time.
import app from "../server.js";

// Vercel serverless entrypoint. vercel.json rewrites /api/* and /uploads/*
// to this function; the Express app handles routing from there. Static
// frontend assets are served directly from dist/ by Vercel's CDN.
export default app;
