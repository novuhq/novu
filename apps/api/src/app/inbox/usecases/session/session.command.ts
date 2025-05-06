import { IsDefined, IsOptional, IsString, ValidateNested } from 'class-validator';
import { BaseCommand } from '@novu/application-generic';
import { Type } from 'class-transformer';

import { SubscriberDto } from '../../dtos/subscriber-session-request.dto';

export class SessionCommand extends BaseCommand {
  @IsDefined()
  @IsString()
  readonly applicationIdentifier: string;

  @IsString()
  @IsOptional()
  readonly subscriberHash?: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => SubscriberDto)
  readonly subscriber: SubscriberDto;

  @IsOptional()
  @IsString()
  readonly origin?: string;
}
