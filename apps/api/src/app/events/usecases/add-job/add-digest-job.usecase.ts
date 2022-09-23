import { Injectable } from '@nestjs/common';
import { JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { WorkflowQueueService } from '../../services/workflow.queue.service';
import { AddJobCommand } from './add-job.command';

@Injectable()
export class AddDigestJob {
  constructor(private jobRepository: JobRepository, private workflowQueueService: WorkflowQueueService) {}

  public async execute(command: AddJobCommand): Promise<boolean> {
    const data = await this.jobRepository.findById(command.jobId);

    if (!data) {
      return false;
    }

    const isValidDigestStep = data.type === StepTypeEnum.DIGEST && data.digest.amount && data.digest.unit;
    if (!isValidDigestStep) {
      return false;
    }

    const where: Partial<JobEntity> = {
      status: JobStatusEnum.DELAYED,
      type: StepTypeEnum.DIGEST,
      _subscriberId: data._subscriberId,
      _templateId: data._templateId,
      _environmentId: data._environmentId,
    };
    const delayedDigest = await this.jobRepository.findOne(where);

    if (delayedDigest) {
      return true;
    }

    await this.jobRepository.updateStatus(data._id, JobStatusEnum.DELAYED);
    const delay = WorkflowQueueService.toMilliseconds(data.digest.amount, data.digest.unit);

    await await this.workflowQueueService.addToQueue(data._id, data, delay);

    return true;
  }
}
