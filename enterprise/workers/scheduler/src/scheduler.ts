import ky from 'ky';
import type { ScheduledJob, ScheduleJobRequest } from './types';

/**
 * Storage key for the job data within this Durable Object instance.
 * Note: Each jobId gets its own isolated Durable Object instance via `idFromName(jobId)`,
 * so this constant key doesn't cause conflicts between different jobs.
 * Each instance has completely separate storage - using "job" as the key is safe and simple.
 */
const JOB_KEY = 'job';

export class Scheduler implements DurableObject {
  constructor(
    private state: DurableObjectState,
    private env: Env
  ) {}

  async fetch(request: Request): Promise<Response> {
    try {
      const action = request.headers.get('X-Action');

      switch (action) {
        case 'schedule': {
          const body = await request.json<ScheduleJobRequest>();
          await this.scheduleJob(body);
          return Response.json({ success: true });
        }

        case 'cancel': {
          const cancelled = await this.cancelJob();
          return Response.json({ success: cancelled });
        }

        default:
          return Response.json({ error: 'Invalid action' }, { status: 400 });
      }
    } catch (error) {
      return Response.json(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }
  }

  async alarm(): Promise<void> {
    const job = await this.state.storage.get<ScheduledJob>(JOB_KEY);

    if (!job) {
      console.warn('[Scheduler] Alarm fired but no job found');
      return;
    }

    try {
      await this.executeJob(job);
    } catch (error) {
      console.error(`[Scheduler] Job ${job.id} execution failed:`, {
        jobId: job.id,
        mode: job.mode,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      await Promise.all([this.state.storage.deleteAll(), this.state.storage.deleteAlarm()]);
    }
  }

  private async scheduleJob(request: ScheduleJobRequest): Promise<void> {
    const now = Date.now();
    const isInPast = request.scheduledFor <= now;

    if (isInPast) {
      console.log(`[Scheduler] Job ${request.jobId} scheduled time is in the past, executing immediately`, {
        scheduledFor: new Date(request.scheduledFor).toISOString(),
        currentTime: new Date(now).toISOString(),
        delayMs: now - request.scheduledFor,
      });

      const job: ScheduledJob = {
        id: request.jobId,
        scheduledFor: request.scheduledFor,
        mode: request.mode,
        createdAt: now,
        data: request.data,
      };

      await this.executeJob(job);

      return;
    }

    const job: ScheduledJob = {
      id: request.jobId,
      scheduledFor: request.scheduledFor,
      mode: request.mode,
      createdAt: now,
      data: request.data,
    };

    await Promise.all([this.state.storage.put(JOB_KEY, job), this.state.storage.setAlarm(request.scheduledFor)]);

    console.log(`[Scheduler] Job ${request.jobId} scheduled for ${new Date(request.scheduledFor).toISOString()}`);
  }

  private async cancelJob(): Promise<boolean> {
    const job = await this.state.storage.get<ScheduledJob>(JOB_KEY);

    if (!job) {
      return false;
    }

    await Promise.all([this.state.storage.deleteAll(), this.state.storage.deleteAlarm()]);

    return true;
  }

  private async executeJob(job: ScheduledJob): Promise<void> {
    console.log(`[Scheduler] Executing job ${job.id}`, {
      mode: job.mode,
      scheduledFor: new Date(job.scheduledFor).toISOString(),
      actualTime: new Date().toISOString(),
      alarmDriftMs: Date.now() - job.scheduledFor,
    });

    if (!this.env.CALLBACK_API_URL || !this.env.CALLBACK_API_KEY) {
      console.error('CALLBACK_API_URL or CALLBACK_API_KEY not configured, skipping API call');
      return;
    }

    const client = ky.create({
      timeout: 30000,
      retry: {
        limit: 3,
        methods: ['post'],
        statusCodes: [408, 413, 429, 500, 502, 503, 504],
        backoffLimit: 10000,
      },
    });

    const result = await client
      .post(`${this.env.CALLBACK_API_URL}/v1/internal/scheduler/callback`, {
        json: {
          jobId: job.id,
          mode: job.mode,
          data: job.data,
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.env.CALLBACK_API_KEY}`,
          // 'Idempotency-Key': job.id,
        },
      })
      .json();

    console.log(`[Scheduler] Successfully called API for job ${job.id}`, result);
  }
}
