import { OrganizationLevelWithUserCommand } from '@novu/application-generic';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class GetEnvironmentVariablesCommand extends OrganizationLevelWithUserCommand {
  @IsString()
  @IsOptional()
  search?: string;

  @IsBoolean()
  @IsOptional()
  scopeToEnvironment?: boolean;
}
