import os from "node:os";
import { db } from "../db/client.js";
import { getAIProvider } from "../ai/index.js";
import { config } from "../config.js";
import { getRecentErrors, getErrorCountLastHour } from "./error-log.js";

export interface SystemHealth {
  status: "healthy" | "degraded" | "down";
  timestamp: string;
  ai: {
    healthy: boolean;
    model: string;
  };
  database: {
    healthy: boolean;
    reachable: boolean;
  };
  jobs: {
    pendingCount: number;
    runningCount: number;
    failedLastHour: number;
  };
  errors: {
    countLastHour: number;
    recent: ReturnType<typeof getRecentErrors>;
  };
  resources: {
    uptimeSeconds: number;
    memoryUsedMb: number;
    memoryTotalMb: number;
    cpuLoadAvg1m: number;
  };
}

export async function getSystemHealth(): Promise<SystemHealth> {
  let dbHealthy = false;
  let pendingCount = 0;
  let runningCount = 0;
  let failedLastHour = 0;

  try {
    const pendingRow = db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status IN ('pending', 'pending_approval')").get() as { c: number };
    const runningRow = db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status = 'running'").get() as { c: number };
    const failedRow = db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status = 'failed' AND finished_at > datetime('now', '-1 hour')").get() as { c: number };
    pendingCount = pendingRow.c;
    runningCount = runningRow.c;
    failedLastHour = failedRow.c;
    dbHealthy = true;
  } catch {
    dbHealthy = false;
  }

  let aiHealthy = false;
  try {
    const provider = getAIProvider();
    aiHealthy = await provider.healthCheck();
  } catch {
    aiHealthy = false;
  }

  const memTotal = os.totalmem();
  const memFree = os.freemem();
  const memUsedMb = Math.round((memTotal - memFree) / 1024 / 1024);
  const memTotalMb = Math.round(memTotal / 1024 / 1024);
  const loadAvg = os.loadavg();

  const errorCountLastHour = getErrorCountLastHour();

  let status: SystemHealth["status"] = "healthy";
  if (!dbHealthy || !aiHealthy) {
    status = "down";
  } else if (failedLastHour > 3 || errorCountLastHour > 10) {
    status = "degraded";
  }

  return {
    status: status,
    timestamp: new Date().toISOString(),
    ai: {
      healthy: aiHealthy,
      model: config.AI_MODEL,
    },
    database: {
      healthy: dbHealthy,
      reachable: dbHealthy,
    },
    jobs: {
      pendingCount: pendingCount,
      runningCount: runningCount,
      failedLastHour: failedLastHour,
    },
    errors: {
      countLastHour: errorCountLastHour,
      recent: getRecentErrors(10),
    },
    resources: {
      uptimeSeconds: Math.round(process.uptime()),
      memoryUsedMb: memUsedMb,
      memoryTotalMb: memTotalMb,
      cpuLoadAvg1m: Math.round(loadAvg[0] * 100) / 100,
    },
  };
}
