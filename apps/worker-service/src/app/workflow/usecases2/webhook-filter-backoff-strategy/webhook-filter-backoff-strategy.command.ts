import { IsDefined, IsNumber, IsOptional } from 'class-validator';

import { EventJobDto } from './event-job.dto';
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
