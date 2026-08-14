import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";
import { AppError } from "../error-handler.js";

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.path === "/health") {
    next();
    return;
  }

  const provided = req.header("x-api-key");
  if (!config.API_KEY) {
    next();
    return;
  }

  if (!provided || provided !== config.API_KEY) {
    throw new AppError("Unauthorized: missing or invalid API key", 401);
  }

  next();
}
