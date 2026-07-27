import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { jobsRouter } from "./routes/jobs";
import { articlesRouter } from "./routes/articles";
import { marketsRouter } from "./routes/markets";
import { audiencesRouter } from "./routes/audiences";
import { countriesRouter } from "./routes/countries";
import { emailsRouter } from "./routes/emails";
import { publishedArticlesRouter } from "./routes/published-articles";
import { attentionRouter } from "./routes/attention";
import { activityRouter } from "./routes/activity";
import { sectorsRouter } from "./routes/sectors";
import { uploadsRouter } from "./routes/uploads";
import { migrationsRouter } from "./routes/migrations";
import { isMockMode } from "./lib/claude";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString(), mockMode: isMockMode });
});

app.use("/api/jobs", jobsRouter);
app.use("/api/articles", articlesRouter);
app.use("/api/published-articles", publishedArticlesRouter);
app.use("/api/attention", attentionRouter);
app.use("/api/activity", activityRouter);
app.use("/api/markets", marketsRouter);
app.use("/api/sectors", sectorsRouter);
app.use("/api/audiences", audiencesRouter);
app.use("/api/countries", countriesRouter);
app.use("/api/emails", emailsRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/migrations", migrationsRouter);

// ── Production: serve the built React app + SPA fallback ──
// In dev, Vite serves the client on port 5173 and proxies /api to us.
// In prod (Railway, Render, etc.) one Node process serves both the built
// bundle and the API from the same origin, so relative /api/... URLs on
// the client just work with no CORS.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "..", "dist");
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  // SPA fallback — any non-/api path returns index.html so React Router
  // can handle the route on the client.
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
  console.log(`[server] serving built client from ${distDir}`);
}

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(`[server] mode: ${isMockMode ? "MOCK (no ANTHROPIC_API_KEY)" : "live Claude API"}`);
});
