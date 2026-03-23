import { OrganizationLevelWithUserCommand } from '@novu/application-generic';
import { IsOptional, IsString } from 'class-validator';

export class GetEnvironmentVariablesCommand extends OrganizationLevelWithUserCommand {
  @IsString()
  @IsOptional()
  search?: string;
}
