import cron from "node-cron";
import { getEnabledSchedules, updateLastRun } from "../db/schedules.js";
import { enqueueJob } from "../jobs/runner.js";
import { logger } from "../logger.js";

const activeTasks = new Map<number, cron.ScheduledTask>();

export function startScheduler(): void {
  const schedules = getEnabledSchedules();

  for (const schedule of schedules) {
    registerCronTask(schedule.id, schedule.cron_expression, schedule.job_type, schedule.job_input_json);
  }

  logger.info({ count: schedules.length }, "Scheduler started");
}

function registerCronTask(id: number, cronExpression: string, jobType: string, jobInputJson: string): void {
  if (!cron.validate(cronExpression)) {
    logger.error({ id, cronExpression }, "Invalid cron expression, skipping schedule");
    return;
  }

  const task = cron.schedule(cronExpression, () => {
    try {
      const input = JSON.parse(jobInputJson);
      const jobId = enqueueJob(jobType, input);
      updateLastRun(id);
      logger.info({ scheduleId: id, jobId, jobType }, "Scheduled job triggered");
    } catch (err) {
      logger.error({ scheduleId: id, err }, "Failed to trigger scheduled job");
    }
  });

  activeTasks.set(id, task);
}

export function refreshScheduler(): void {
  for (const task of activeTasks.values()) {
    task.stop();
  }
  activeTasks.clear();
  startScheduler();
}
