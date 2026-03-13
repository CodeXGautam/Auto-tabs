/**
 * backend/src/index.ts — Express server entry point
 *
 * Starts the HTTP server and mounts all API routes.
 * This is the main entry point for the Node.js backend.
 */
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { analysisRouter } from "./routes/analysis.js";

const app = express();

// ── Middleware ────────────────────────────────────────────────
app.use(morgan("dev"));        // Log every request to stdout
app.use(cors());               // Allow frontend cross-origin requests
app.use(express.json());       // Parse JSON request bodies

// ── Health check ─────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ── Mount routes ─────────────────────────────────────────────
app.use("/api", analysisRouter);

// ── Start server ─────────────────────────────────────────────
const port = Number(process.env.BACKEND_PORT) || 3000;

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
