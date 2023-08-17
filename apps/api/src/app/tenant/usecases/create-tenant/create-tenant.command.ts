import { TenantCustomData } from '@novu/shared';
import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTenantCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsOptional()
  data?: TenantCustomData;
}
