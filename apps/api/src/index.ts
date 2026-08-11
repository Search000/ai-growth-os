import express from "express";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { errorHandler, notFoundHandler, AppError } from "./error-handler.js";
import { getAIProvider } from "./ai/index.js";
import { registerTools, toolRegistry } from "./tools/index.js";
import { isValidUrl, normalizeUrl } from "./crawler/url-utils.js";
import { isAllowedByRobots } from "./crawler/robots.js";
import { fetchPage } from "./crawler/fetcher.js";
import { extractMetadata } from "./crawler/metadata.js";
import { runSeoChecks, scoreChecks } from "./seo/rules.js";
import { runSeoAgent } from "./agent/seo-agent.js";
import { saveReport, listReports, getReport } from "./db/reports.js";
import "./db/client.js";

registerTools();

const app = express();

app.use(express.json());

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

app.post("/api/tools/:name/execute", async (req, res, next) => {
  try {
    const result = await toolRegistry.execute(req.params.name, req.body ?? {});
    res.json({ result });
  } catch (err) {
    next(err);
  }
});

app.post("/api/chat", async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== "string") {
      throw new AppError("Field \"message\" (string) is required", 400);
    }

    const provider = getAIProvider();
    const result = await provider.chat([{ role: "user", content: message }]);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.post("/api/crawl/page", async (req, res, next) => {
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

app.post("/api/seo/analyze", async (req, res, next) => {
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

app.post("/api/agent/seo", async (req, res, next) => {
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

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.PORT, () => {
  logger.info(`AI Growth OS API listening on port ${config.PORT}`);
});
