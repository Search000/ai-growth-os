import express from "express";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { errorHandler, notFoundHandler } from "./error-handler.js";

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: config.NODE_ENV,
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.PORT, () => {
  logger.info(`AI Growth OS API listening on port ${config.PORT}`);
});
