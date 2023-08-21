import { TenantCustomData } from '@novu/shared';
import { EnvironmentWithUserCommand } from '../../commands';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTenantCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  data?: TenantCustomData;
}
