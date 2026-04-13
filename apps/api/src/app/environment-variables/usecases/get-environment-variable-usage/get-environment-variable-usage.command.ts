import { OrganizationLevelWithUserCommand } from '@novu/application-generic';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetEnvironmentVariableUsageCommand extends OrganizationLevelWithUserCommand {
  @IsString()
  @IsNotEmpty()
  variableKey: string;
}
