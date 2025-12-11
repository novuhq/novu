import ky from 'ky';
import type { ScheduledJob, ScheduleJobRequest } from './types';

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

    await this.state.storage.delete(JOB_KEY);

    try {
      await this.executeJob(job);
    } catch (error) {
      console.error(`[Scheduler] Job ${job.id} execution failed:`, {
        jobId: job.id,
        type: job.type,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async scheduleJob(request: ScheduleJobRequest): Promise<void> {
    const job: ScheduledJob = {
      id: request.jobId,
      type: request.type,
      scheduledFor: request.scheduledFor,
      createdAt: Date.now(),
      data: request.data,
      metadata: request.metadata,
    };

    await this.state.storage.put(JOB_KEY, job);
    await this.state.storage.setAlarm(request.scheduledFor);
  }

  private async cancelJob(): Promise<boolean> {
    const job = await this.state.storage.get<ScheduledJob>(JOB_KEY);

    if (!job) {
      return false;
    }

    await this.state.storage.delete(JOB_KEY);
    await this.state.storage.deleteAlarm();

    return true;
  }

  private async executeJob(job: ScheduledJob): Promise<void> {
    console.log(`[Scheduler] Executing job ${job.id}`, {
      type: job.type,
      mode: job.metadata?.mode,
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
          type: job.type,
          data: job.data,
          metadata: job.metadata,
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.env.CALLBACK_API_KEY}`,
          'Idempotency-Key': job.id,
        },
      })
      .json();

    console.log(`[Scheduler] Successfully called API for job ${job.id}`, result);
  }
}
