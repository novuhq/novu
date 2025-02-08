import { Injectable } from '@nestjs/common';

import { ExecutionLogRouteCommand } from './execution-log-route.command';
import {
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
} from '../create-execution-details';

// TODO: This usecase is not needed anymore. It can be replaces with a direct invocation of CreateExecutionDetails
@Injectable()
export class ExecutionLogRoute {
  constructor(private createExecutionDetails: CreateExecutionDetails) {}

  async execute(command: ExecutionLogRouteCommand) {
    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create(command),
    );
  }
}
