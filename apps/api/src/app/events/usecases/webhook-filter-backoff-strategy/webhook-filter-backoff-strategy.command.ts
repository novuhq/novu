import { IsDefined, IsNumber, IsOptional } from 'class-validator';

import { EventJobDto } from '../../dtos';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class WebhookFilterBackoffStrategyCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsNumber()
  attemptsMade: number;

  @IsOptional()
  eventError: Error;

  @IsDefined()
  eventJob: EventJobDto;
}
