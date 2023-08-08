import { IsDefined, IsOptional, IsString } from 'class-validator';

import { BaseCommand } from '@novu/application-generic';

export class SendMessageRouteCommand extends BaseCommand {
  @IsDefined()
  @IsString()
  userId: string;

  @IsDefined()
  @IsString()
  event: string;

  @IsOptional()
  payload: Record<string, unknown>;

  @IsString()
  _environmentId?: string;
}
