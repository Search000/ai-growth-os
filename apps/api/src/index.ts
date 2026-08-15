import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { errorHandler, notFoundHandler, AppError } from "./error-handler.js";
import { getAIProvider } from "./ai/index.js";
import { registerTools, toolRegistry } from "./tools/index.js";
import { isValidUrl, normalizeUrl } from "./crawler/url-utils.js";
import { isAllowedByRobots } from "./crawler/robots.js";
import { fetchPage } from "./crawler/fetcher.js";
import { extractMetadata } from "./crawler/metadata.js";
import { crawlSite } from "./crawler/site-crawler.js";
import { runSeoChecks, scoreChecks } from "./seo/rules.js";
import { runSeoAgent } from "./agent/seo-agent.js";
import { saveReport, listReports, getReport, deleteReport } from "./db/reports.js";
import { runAnalysisEngine } from "./engines/analysis-engine.js";
import { generateContent, type ContentType } from "./engines/content-engine.js";
import { runStrategyEngine } from "./engines/strategy-engine.js";
import { addMemory, getRecentMemory, clearMemory } from "./db/memory.js";
import { registerJobHandler, enqueueJob, enqueueApprovedJob } from "./jobs/runner.js";
import { getJob, listJobs, listPendingApprovals, rejectJob } from "./db/jobs.js";
import { apiKeyAuth } from "./auth/api-key.js";
import { createSchedule, listSchedules, setScheduleEnabled, deleteSchedule } from "./db/schedules.js";
import { startScheduler, refreshScheduler } from "./scheduler/index.js";
import { validateOutput } from "./validation/output-validator.js";
import cron from "node-cron";
import { ingestDocument, retrieveRelevantChunks } from "./knowledge/rag.js";
import "./db/client.js";

registerTools();

registerJobHandler("crawl_site", async (input) => {
  const { url, maxPages } = input as { url: string; maxPages?: number };
  return crawlSite(url, { maxPages: maxPages ?? 10 });
});

registerJobHandler("seo_agent", async (input) => {
  const { url } = input as { url: string };
  const report = await runSeoAgent(url);
  const toolResult = report.toolResult as { score: number; checks: unknown };
  saveReport({
    url: report.url,
    score: toolResult.score,
    checks: toolResult.checks,
    recommendation: report.recommendation,
    durationMs: report.durationMs,
  });
  return report;
});

registerJobHandler("orm_response", async (input) => {
  const { topic } = input as { topic: string };
  return runStrategyEngine("orm", topic);
});

startScheduler();

const app = express();

app.use(cors());
app.use(express.json());

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "Too many requests, slow down.", statusCode: 429 } },
});
app.use(globalLimiter);

app.use(apiKeyAuth);

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "AI request limit reached, please wait a minute.", statusCode: 429 } },
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: config.NODE_ENV,
  });
});

app.get("/api/ai/health", async (req, res, next) => {
  try {
    const provider = getAIProvider();
    const healthy = await provider.healthCheck();
    res.json({ aiHealthy: healthy, model: config.AI_MODEL });
  } catch (err) {
    next(err);
  }
});

app.get("/api/tools", (req, res) => {
  const tools = toolRegistry.list().map((t) => ({
    name: t.name,
    description: t.description,
    permission: t.permission,
  }));
  res.json({ tools });
});

app.post("/api/tools/:name/execute", aiLimiter, async (req, res, next) => {
  try {
    const result = await toolRegistry.execute(String(req.params.name), req.body ?? {});
    res.json({ result });
  } catch (err) {
    next(err);
  }
});

app.post("/api/chat", aiLimiter, async (req, res, next) => {
  try {
    const { message, sessionId } = req.body;
    if (!message || typeof message !== "string") {
      throw new AppError("Field \"message\" (string) is required", 400);
    }
    const sid = typeof sessionId === "string" && sessionId ? sessionId : "default";

    const history = getRecentMemory(sid, 10);
    const messages = [
      ...history.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
      { role: "user" as const, content: message },
    ];

    const provider = getAIProvider();
    const result = await provider.chat(messages);

    addMemory(sid, "user", message);
    addMemory(sid, "assistant", result.content);

    res.json({ ...result, sessionId: sid });
  } catch (err) {
    next(err);
  }
});

app.delete("/api/chat/:sessionId", (req, res) => {
  clearMemory(req.params.sessionId);
  res.json({ cleared: true });
});

app.post("/api/crawl/page", aiLimiter, async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string" || !isValidUrl(url)) {
      throw new AppError("Field \"url\" (valid http/https URL) is required", 400);
    }

    const normalized = normalizeUrl(url);

    const allowed = await isAllowedByRobots(normalized);
    if (!allowed) {
      throw new AppError("Blocked by robots.txt", 403);
    }

    const page = await fetchPage(normalized);
    const metadata = extractMetadata(page.html, normalized);

    res.json({
      url: normalized,
      statusCode: page.statusCode,
      durationMs: page.durationMs,
      metadata,
    });
  } catch (err) {
    next(err);
  }
});

app.post("/api/jobs/crawl-site", aiLimiter, (req, res, next) => {
  try {
    const { url, maxPages } = req.body;
    if (!url || typeof url !== "string" || !isValidUrl(url)) {
      throw new AppError("Field \"url\" (valid http/https URL) is required", 400);
    }
    const jobId = enqueueJob("crawl_site", { url: normalizeUrl(url), maxPages });
    res.status(202).json({ jobId, status: "pending" });
  } catch (err) {
    next(err);
  }
});

app.post("/api/jobs/seo-agent", aiLimiter, (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string" || !isValidUrl(url)) {
      throw new AppError("Field \"url\" (valid http/https URL) is required", 400);
    }
    const jobId = enqueueJob("seo_agent", { url: normalizeUrl(url) });
    res.status(202).json({ jobId, status: "pending" });
  } catch (err) {
    next(err);
  }
});

app.post("/api/jobs/orm-response", aiLimiter, (req, res, next) => {
  try {
    const { topic } = req.body;
    if (!topic || typeof topic !== "string") {
      throw new AppError("Field \"topic\" (string) is required", 400);
    }
    const jobId = enqueueJob("orm_response", { topic }, true);
    res.status(202).json({ jobId, status: "pending_approval" });
  } catch (err) {
    next(err);
  }
});

app.get("/api/jobs", (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  res.json({ jobs: listJobs(limit) });
});

app.get("/api/jobs/:id", (req, res, next) => {
  try {
    const job = getJob(Number(req.params.id));
    if (!job) {
      throw new AppError("Job not found", 404);
    }
    res.json({ job });
  } catch (err) {
    next(err);
  }
});

app.get("/api/approvals", (req, res) => {
  res.json({ pending: listPendingApprovals() });
});

app.post("/api/approvals/:id/approve", (req, res, next) => {
  try {
    enqueueApprovedJob(Number(req.params.id));
    res.json({ approved: true });
  } catch (err) {
    next(err);
  }
});

app.post("/api/approvals/:id/reject", (req, res) => {
  rejectJob(Number(req.params.id));
  res.json({ rejected: true });
});

app.post("/api/validate", aiLimiter, async (req, res, next) => {
  try {
    const { sourceData, generatedText } = req.body;
    if (!generatedText || typeof generatedText !== "string") {
      throw new AppError("Field \"generatedText\" (string) is required", 400);
    }
    const result = await validateOutput(sourceData ?? {}, generatedText);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.post("/api/schedules", (req, res, next) => {
  try {
    const { name, jobType, jobInput, cronExpression } = req.body;
    if (!name || !jobType || !cronExpression) {
      throw new AppError("Fields \"name\", \"jobType\", \"cronExpression\" are required", 400);
    }
    if (!cron.validate(cronExpression)) {
      throw new AppError("Invalid cron expression", 400);
    }
    const id = createSchedule(name, jobType, jobInput ?? {}, cronExpression);
    refreshScheduler();
    res.status(201).json({ id });
  } catch (err) {
    next(err);
  }
});

app.get("/api/schedules", (req, res) => {
  res.json({ schedules: listSchedules() });
});

app.patch("/api/schedules/:id", (req, res, next) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") {
      throw new AppError("Field \"enabled\" (boolean) is required", 400);
    }
    setScheduleEnabled(Number(req.params.id), enabled);
    refreshScheduler();
    res.json({ updated: true });
  } catch (err) {
    next(err);
  }
});

app.delete("/api/schedules/:id", (req, res, next) => {
  try {
    const deleted = deleteSchedule(Number(req.params.id));
    if (!deleted) {
      throw new AppError("Schedule not found", 404);
    }
    refreshScheduler();
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

app.post("/api/seo/analyze", aiLimiter, async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string" || !isValidUrl(url)) {
      throw new AppError("Field \"url\" (valid http/https URL) is required", 400);
    }

    const normalized = normalizeUrl(url);

    const allowed = await isAllowedByRobots(normalized);
    if (!allowed) {
      throw new AppError("Blocked by robots.txt", 403);
    }

    const page = await fetchPage(normalized);
    const metadata = extractMetadata(page.html, normalized);
    const checks = runSeoChecks(metadata, page.statusCode);
    const score = scoreChecks(checks);

    res.json({ url: normalized, score, checks });
  } catch (err) {
    next(err);
  }
});

app.post("/api/agent/seo", aiLimiter, async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string" || !isValidUrl(url)) {
      throw new AppError("Field \"url\" (valid http/https URL) is required", 400);
    }

    const report = await runSeoAgent(normalizeUrl(url));

    const toolResult = report.toolResult as { score: number; checks: unknown };
    const savedId = saveReport({
      url: report.url,
      score: toolResult.score,
      checks: toolResult.checks,
      recommendation: report.recommendation,
      durationMs: report.durationMs,
    });

    res.json({ ...report, savedId });
  } catch (err) {
    next(err);
  }
});

app.get("/api/reports", (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const reports = listReports(limit);
  res.json({ reports });
});

app.get("/api/reports/:id", (req, res, next) => {
  try {
    const report = getReport(Number(req.params.id));
    if (!report) {
      throw new AppError("Report not found", 404);
    }
    res.json({ report });
  } catch (err) {
    next(err);
  }
});

app.delete("/api/reports/:id", (req, res, next) => {
  try {
    const deleted = deleteReport(Number(req.params.id));
    if (!deleted) {
      throw new AppError("Report not found", 404);
    }
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

app.post("/api/engine/:type", aiLimiter, async (req, res, next) => {
  try {
    const engineType = String(req.params.type);
    if (!["geo", "aeo", "cro", "lpo"].includes(engineType)) {
      throw new AppError(`Unknown engine type: ${engineType}. Use geo, aeo, cro, or lpo.`, 400);
    }

    const { url } = req.body;
    if (!url || typeof url !== "string" || !isValidUrl(url)) {
      throw new AppError("Field \"url\" (valid http/https URL) is required", 400);
    }

    const report = await runAnalysisEngine(engineType, normalizeUrl(url));
    res.json(report);
  } catch (err) {
    next(err);
  }
});

app.post("/api/strategy/:type", aiLimiter, async (req, res, next) => {
  try {
    const engineType = String(req.params.type);
    if (!["sem", "aso", "vseo", "smo", "orm"].includes(engineType)) {
      throw new AppError(`Unknown strategy engine: ${engineType}. Use sem, aso, vseo, smo, or orm.`, 400);
    }

    const { topic } = req.body;
    if (!topic || typeof topic !== "string") {
      throw new AppError("Field \"topic\" (string) is required", 400);
    }

    const report = await runStrategyEngine(engineType, topic);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

app.post("/api/content/:type", aiLimiter, async (req, res, next) => {
  try {
    const contentType = req.params.type as ContentType;
    const validTypes: ContentType[] = ["brief", "outline", "article", "landing-copy", "product-description", "faq", "social-post", "meta-description", "title", "cta"];
    if (!validTypes.includes(contentType)) {
      throw new AppError(`Unknown content type: ${contentType}. Use one of: ${validTypes.join(", ")}`, 400);
    }

    const { topic, context } = req.body;
    if (!topic || typeof topic !== "string") {
      throw new AppError("Field \"topic\" (string) is required", 400);
    }

    const result = await generateContent(contentType, topic, context);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.post("/api/knowledge/ingest", aiLimiter, async (req, res, next) => {
  try {
    const { sourceType, sourceRef, text } = req.body;
    if (!sourceType || typeof sourceType !== "string") {
      throw new AppError(`"sourceType" (string) is required`, 400);
    }
    if (!sourceRef || typeof sourceRef !== "string") {
      throw new AppError(`"sourceRef" (string) is required`, 400);
    }
    if (!text || typeof text !== "string") {
      throw new AppError(`"text" (string) is required`, 400);
    }
    const chunkCount = await ingestDocument(sourceType, sourceRef, text);
    res.status(201).json({ ingested: true, chunkCount });
  } catch (err) {
    next(err);
  }
});

app.post("/api/knowledge/query", aiLimiter, async (req, res, next) => {
  try {
    const { query, topK } = req.body;
    if (!query || typeof query !== "string") {
      throw new AppError(`"query" (string) is required`, 400);
    }
    const results = await retrieveRelevantChunks(query, topK ?? 5);
    res.json({ results });
  } catch (err) {
    next(err);
  }
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.PORT, () => {
  logger.info(`AI Growth OS API listening on port ${config.PORT}`);
});


