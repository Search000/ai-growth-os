import type { NextFunction, Request, Response } from "express";
import { logger } from "./logger.js";
import { recordError } from "./monitoring/error-log.js";

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  logger.error({ err, path: req.path, method: req.method }, "Request failed");
  recordError(err.message || "Internal server error", req.path, req.method, statusCode);
  res.status(statusCode).json({
    error: {
      message: err.message || "Internal server error",
      statusCode,
    },
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: {
      message: `Route not found: ${req.method} ${req.path}`,
      statusCode: 404,
    },
  });
}
