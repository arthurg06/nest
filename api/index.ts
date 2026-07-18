import app from "../server";

// Vercel serverless entrypoint. vercel.json rewrites /api/* and /uploads/*
// to this function; the Express app handles routing from there. Static
// frontend assets are served directly from dist/ by Vercel's CDN.
export default app;
