import { IsDefined, IsOptional, IsString } from 'class-validator';

import { BaseCommand } from '@novu/application-generic';

export class ExternalServicesRouteCommand extends BaseCommand {
  @IsDefined()
  @IsString()
  userId: string;

  @IsDefined()
  @IsString()
  event: string;

  @IsOptional()
  payload: Record<string, unknown>;

  @IsString()
  @IsOptional()
  _environmentId?: string;
}
