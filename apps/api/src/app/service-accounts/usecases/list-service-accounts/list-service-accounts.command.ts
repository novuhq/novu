import { OrganizationLevelWithUserCommand } from '@novu/application-generic';
import { IsOptional, IsString } from 'class-validator';

export class ListServiceAccountsCommand extends OrganizationLevelWithUserCommand {
  @IsString()
  @IsOptional()
  environmentId?: string;
}
