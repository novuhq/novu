import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { IsDefined, IsNumber, IsOptional } from 'class-validator';

import { EventJobDto } from './event-job.dto';

export class WebhookFilterBackoffStrategyCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsNumber()
  attemptsMade: number;

  @IsOptional()
  eventError: Error;

  @IsDefined()
  eventJob: EventJobDto;
}
