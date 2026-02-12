import { Injectable, NotFoundException } from '@nestjs/common';
import { AiResourceTypeEnum } from '@novu/shared';
import { RevertResourceStrategy } from './revert-resource.interface';
import { WorkflowRevertStrategy } from './workflow-revert.strategy';

@Injectable()
export class RevertResourceFactory {
  constructor(private readonly workflowRevertStrategy: WorkflowRevertStrategy) {}

  getStrategy(resourceType: AiResourceTypeEnum): RevertResourceStrategy {
    switch (resourceType) {
      case AiResourceTypeEnum.WORKFLOW:
        return this.workflowRevertStrategy;
      default:
        throw new NotFoundException(`No revert strategy found for resource type: ${resourceType}`);
    }
  }
}
