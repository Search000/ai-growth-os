import express from "express";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { errorHandler, notFoundHandler, AppError } from "./error-handler.js";
import { getAIProvider } from "./ai/index.js";
import { registerTools, toolRegistry } from "./tools/index.js";

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

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.PORT, () => {
  logger.info(`AI Growth OS API listening on port ${config.PORT}`);
});
