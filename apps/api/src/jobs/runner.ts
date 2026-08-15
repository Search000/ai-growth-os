import { createJob, startJob, completeJob, failJob, getJob, approveJob } from "../db/jobs.js";
import { logger } from "../logger.js";

type JobHandler = (input: unknown) => Promise<unknown>;

const handlers = new Map<string, JobHandler>();
const queue: number[] = [];
let processing = false;

export function registerJobHandler(type: string, handler: JobHandler): void {
  handlers.set(type, handler);
}

export function enqueueJob(type: string, input: unknown, requiresApproval = false): number {
  if (!handlers.has(type)) {
    throw new Error(`No handler registered for job type: ${type}`);
  }
  const id = createJob(type, input, requiresApproval);
  if (!requiresApproval) {
    queue.push(id);
    logger.info({ jobId: id, type }, "Job enqueued");
    processQueue();
  } else {
    logger.info({ jobId: id, type }, "Job created, awaiting human approval");
  }
  return id;
}

export function enqueueApprovedJob(id: number): void {
  approveJob(id);
  queue.push(id);
  logger.info({ jobId: id }, "Approved job enqueued");
  processQueue();
}

async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;

  while (queue.length > 0) {
    const id = queue.shift()!;
    const job = getJob(id);
    if (!job) continue;

    const handler = handlers.get(job.type);
    if (!handler) {
      failJob(id, `No handler for type: ${job.type}`);
      continue;
    }

    startJob(id);
    logger.info({ jobId: id, type: job.type }, "Job started");

    try {
      const input = JSON.parse(job.input_json);
      const result = await handler(input);
      completeJob(id, result);
      logger.info({ jobId: id }, "Job completed");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failJob(id, message);
      logger.error({ jobId: id, err }, "Job failed");
    }
  }

  processing = false;
}
