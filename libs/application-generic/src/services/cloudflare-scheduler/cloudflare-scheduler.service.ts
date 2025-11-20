import { Injectable, Logger } from '@nestjs/common';
import { SchedulerJobType } from './types';

export interface ScheduleJobRequest {
  jobId: string;
  type: SchedulerJobType;
  delayMs: number;
  data: {
    _environmentId: string;
    _id: string;
    _organizationId: string;
    _userId: string;
  };
  metadata?: {
    workflowId?: string;
    subscriberId?: string;
    stepId?: string;
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

    const url = `${this.schedulerUrl}/schedule`;

    Logger.log(
      {
        jobId: request.jobId,
        type: request.type,
        delayMs: request.delayMs,
        scheduledFor: new Date(Date.now() + request.delayMs).toISOString(),
      },
      `Scheduling job in Cloudflare Scheduler`,
      LOG_CONTEXT
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.schedulerApiKey}`,
        },
        body: JSON.stringify(request),
      } as unknown as RequestInit);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        throw new Error(
          `Cloudflare Scheduler API returned ${response.status}: ${response.statusText}. ${errorText}`
        );
      }

      Logger.log({ jobId: request.jobId }, 'Job successfully scheduled in Cloudflare Scheduler', LOG_CONTEXT);
    } catch (error) {
      Logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          jobId: request.jobId,
          type: request.type,
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

    const url = `${this.schedulerUrl}/cancel/${jobId}`;

    Logger.log({ jobId }, 'Canceling job in Cloudflare Scheduler', LOG_CONTEXT);

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.schedulerApiKey}`,
        },
      } as unknown as RequestInit);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        throw new Error(
          `Cloudflare Scheduler API returned ${response.status}: ${response.statusText}. ${errorText}`
        );
      }

      const result = (await response.json()) as { success: boolean };
      Logger.log({ jobId, cancelled: result.success }, 'Job cancellation result from Cloudflare Scheduler', LOG_CONTEXT);

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

