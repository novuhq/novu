import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { TenantCustomData } from '@novu/shared';

export class UpdateTenantCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsString()
  @IsOptional()
  newIdentifier?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsOptional()
  data?: TenantCustomData;
}
