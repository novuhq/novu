import { BaseCommand } from '@novu/application-generic';
import { Type } from 'class-transformer';
import { IsDefined, IsOptional, IsString, ValidateNested } from 'class-validator';

import { SubscriberSessionRequestDto } from '../../dtos/subscriber-session-request.dto';

export class SessionCommand extends BaseCommand {
  @IsDefined()
  @ValidateNested()
  @Type(() => SubscriberSessionRequestDto)
  readonly requestData: SubscriberSessionRequestDto;

  @IsOptional()
  @IsString()
  readonly origin?: string;
}
