import cron from "node-cron";
import { ConfigError } from "../errors/index.js";

export type ScheduledTask = () => Promise<void>;

/**
 * Thin wrapper around node-cron that prevents overlapping runs (a slow
 * backup will never be started twice concurrently) and supports graceful
 * shutdown.
 */
export class Scheduler {
  private task: ReturnType<typeof cron.schedule> | undefined;
  private running = false;

  start(expression: string, handler: ScheduledTask, timezone?: string): void {
    if (!cron.validate(expression)) {
      throw new ConfigError(`Invalid cron expression: "${expression}"`);
    }

    this.task = cron.schedule(
      expression,
      () => {
        void this.runOnce(handler);
      },
      timezone ? { timezone } : undefined
    );
  }

  private async runOnce(handler: ScheduledTask): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await handler();
    } finally {
      this.running = false;
    }
  }

  stop(): void {
    this.task?.stop();
    this.task = undefined;
  }
}
