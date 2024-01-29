import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';

import { ExecutionLogRouteCommand } from './execution-log-route.command';
import {
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
} from '../create-execution-details';
import { ExecutionLogQueueService } from '../../services';
import {
  FeatureFlagCommand,
  GetIsExecutionLogQueueEnabled,
} from '../get-feature-flag';

const LOG_CONTEXT = 'ExecutionLogRoute';

@Injectable()
export class ExecutionLogRoute {
  constructor(
    private createExecutionDetails: CreateExecutionDetails,
    @Inject(forwardRef(() => ExecutionLogQueueService))
    private executionLogQueueService: ExecutionLogQueueService,
    private getIsExecutionLogQueueEnabled: GetIsExecutionLogQueueEnabled
  ) {}

  async execute(command: ExecutionLogRouteCommand) {
    const isEnabled = await this.getIsExecutionLogQueueEnabled.execute(
      FeatureFlagCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
      })
    );

    switch (isEnabled) {
      case true: {
        const metadata =
          CreateExecutionDetailsCommand.getExecutionLogMetadata();

        await this.executionLogQueueService.add({
          name: metadata._id,
          data: CreateExecutionDetailsCommand.create({
            ...metadata,
            ...command,
          }),
          groupId: command.organizationId,
        });
        break;
      }
      case false: {
        await this.createExecutionDetails.execute(
          CreateExecutionDetailsCommand.create(command)
        );
        break;
      }
      default: {
        Logger.warn('Execution log queue feature flag is not set', LOG_CONTEXT);
      }
    }
  }
}
