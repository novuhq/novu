import { IsDefined, IsNumber, IsOptional } from 'class-validator';

import { EventJobDto } from '../../../../../../api/src/app/events/dtos';

import { EnvironmentWithUserCommand } from '../../../../../../api/src/app/shared/commands/project.command';

export class WebhookFilterBackoffStrategyCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsNumber()
  attemptsMade: number;

  @IsOptional()
  eventError: Error;

  @IsDefined()
  eventJob: EventJobDto;
}
