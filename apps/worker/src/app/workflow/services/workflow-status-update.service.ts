import { Injectable } from '@nestjs/common';
import { PinoLogger, WorkflowRunRepository, WorkflowRunStatusEnum } from '@novu/application-generic';
import { JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';

interface WorkflowStatusUpdateParams {
  notificationId: string;
  environmentId: string;
  organizationId: string;
  subscriberId: string;
}

@Injectable()
export class WorkflowStatusUpdateService {
  constructor(
    private jobRepository: JobRepository,
    private workflowRunRepository: WorkflowRunRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * Updates the workflow run status based on jobs using the mapWorkflowRunStatusToDto logic
   */
  async updateWorkflowRunStatus({
    notificationId,
    environmentId,
    organizationId,
    subscriberId,
  }: WorkflowStatusUpdateParams): Promise<void> {
    try {
      const jobs = await this.getJobsForWorkflowRun(notificationId, environmentId, organizationId, subscriberId);

      const newStatus = this.mapWorkflowRunStatusToDto(jobs);

      await this.workflowRunRepository.updateWorkflowRunStatus(notificationId, newStatus, {
        organizationId,
        environmentId,
      });

      this.logger.debug(
        {
          notificationId,
          organizationId,
          environmentId,
          jobsCount: jobs.length,
          newStatus,
        },
        `Updated workflow run status to ${newStatus} based on ${jobs.length} jobs`
      );
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          notificationId,
        },
        'Failed to update workflow run status based on jobs'
      );
    }
  }

  private async getJobsForWorkflowRun(
    workflowRunId: string,
    environmentId: string,
    organizationId: string,
    subscriberId: string
  ) {
    const jobs = await this.jobRepository.find(
      {
        _notificationId: workflowRunId,
        _environmentId: environmentId,
        _organizationId: organizationId,
        _subscriberId: subscriberId,
      },
      undefined,
      {
        limit: 50, // Should be enough for most workflows
        sort: { updatedAt: 1 },
      }
    );

    return jobs;
  }

  /**
   * Maps workflow run status to response DTO status based on jobs
   * Logic based on channel steps (jobs) as defined in the specification:
   * - Success: At least one channel step sent
   * - Error: All channel steps failed
   * - Skipped: Intentionally not sent due to user preferences or logic
   * - Cancelled: Explicitly aborted before sending
   * - Merged: Workflow was merged with another and suppressed sending
   */
  private mapWorkflowRunStatusToDto(jobs: JobEntity[]): WorkflowRunStatusEnum {
    // Filter for channel steps (exclude non-channel steps like trigger, delay, digest, custom)
    const channelSteps = jobs.filter(
      (job) => job.type && ['in_app', 'email', 'sms', 'chat', 'push'].includes(job.type)
    );

    // If no channel steps is it a success
    if (channelSteps.length === 0) {
      return WorkflowRunStatusEnum.SUCCESS;
    }

    // Check completion status
    const completedSteps = channelSteps.filter((job) => job.status === JobStatusEnum.COMPLETED);
    if (completedSteps.length > 0) {
      // Success: At least one channel step sent (completed)
      return WorkflowRunStatusEnum.SUCCESS;
    }

    // Check for specific statuses first
    if (channelSteps.some((job) => job.status === JobStatusEnum.CANCELED)) {
      return WorkflowRunStatusEnum.CANCELED;
    }

    if (channelSteps.some((job) => job.status === JobStatusEnum.MERGED)) {
      return WorkflowRunStatusEnum.MERGED;
    }

    if (channelSteps.some((job) => job.status === JobStatusEnum.SKIPPED)) {
      return WorkflowRunStatusEnum.SKIPPED;
    }

    const failedSteps = channelSteps.filter((job) => job.status === JobStatusEnum.FAILED);
    // Error: All channel steps failed
    if (failedSteps.length === channelSteps.length && channelSteps.length > 0) {
      return WorkflowRunStatusEnum.ERROR;
    }

    this.logger.warn(
      {
        jobIds: channelSteps.map((job) => job._id),
        statuses: channelSteps.map((job) => job.status),
      },
      'WorkflowRunStatus: No matching status found for jobs, falling back to ERROR'
    );

    return WorkflowRunStatusEnum.ERROR;
  }
}
