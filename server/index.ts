import express from "express";
import cors from "cors";
import dotenv from "dotenv";
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

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(`[server] mode: ${isMockMode ? "MOCK (no ANTHROPIC_API_KEY)" : "live Claude API"}`);
});
