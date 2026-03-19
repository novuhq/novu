import { Injectable, Logger } from '@nestjs/common';
import got from 'got';

export interface ScheduleJobRequest {
  jobId: string;
  scheduledFor: number;
  mode: string;
  data: {
    _environmentId: string;
    _id: string;
    _organizationId: string;
    _userId: string;
  };
}

const LOG_CONTEXT = 'CloudflareSchedulerService';

@Injectable()
export class CloudflareSchedulerService {
  private readonly schedulerUrl: string;
  private readonly schedulerApiKey: string;

  constructor() {
    this.schedulerUrl = process.env.SCHEDULER_URL || '';
    this.schedulerApiKey = process.env.SCHEDULER_API_KEY || '';

    if (!this.schedulerUrl) {
      Logger.warn('SCHEDULER_URL is not set', LOG_CONTEXT);
    }
    if (!this.schedulerApiKey) {
      Logger.warn('SCHEDULER_API_KEY is not set', LOG_CONTEXT);
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.schedulerUrl && this.schedulerApiKey);
  }

  public async scheduleJob(request: ScheduleJobRequest): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Cloudflare Scheduler is not configured. Missing SCHEDULER_URL or SCHEDULER_API_KEY');
    }

    Logger.log(
      {
        jobId: request.jobId,
        mode: request.mode,
        scheduledFor: new Date(request.scheduledFor).toISOString(),
      },
      `Scheduling job in Cloudflare Scheduler`,
      LOG_CONTEXT
    );

    try {
      await got.post(`${this.schedulerUrl}/schedule`, {
        json: request,
        headers: {
          Authorization: `Bearer ${this.schedulerApiKey}`,
        },
        responseType: 'json',
        timeout: 10000,
        retry: {
          limit: 3,
          methods: ['POST'],
          statusCodes: [408, 429, 500, 502, 503, 504],
        },
      });

      Logger.log({ jobId: request.jobId }, 'Job successfully scheduled in Cloudflare Scheduler', LOG_CONTEXT);
    } catch (error) {
      Logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          jobId: request.jobId,
        },
        'Failed to schedule job in Cloudflare Scheduler',
        LOG_CONTEXT
      );

      throw error;
    }
  }

  public async cancelJob(jobId: string): Promise<boolean> {
    if (!this.isConfigured()) {
      throw new Error('Cloudflare Scheduler is not configured. Missing SCHEDULER_URL or SCHEDULER_API_KEY');
    }

    Logger.log({ jobId }, 'Canceling job in Cloudflare Scheduler', LOG_CONTEXT);

    try {
      const result = await got
        .delete(`${this.schedulerUrl}/cancel/${jobId}`, {
          headers: {
            Authorization: `Bearer ${this.schedulerApiKey}`,
          },
          responseType: 'json',
          timeout: 10000,
          retry: {
            limit: 3,
            methods: ['DELETE'],
            statusCodes: [408, 429, 500, 502, 503, 504],
          },
        })
        .json<{ success: boolean }>();

      Logger.log(
        { jobId, cancelled: result.success },
        'Job cancellation result from Cloudflare Scheduler',
        LOG_CONTEXT
      );

      return result.success;
    } catch (error) {
      Logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          jobId,
        },
        'Failed to cancel job in Cloudflare Scheduler',
        LOG_CONTEXT
      );

      throw error;
    }
  }
}
