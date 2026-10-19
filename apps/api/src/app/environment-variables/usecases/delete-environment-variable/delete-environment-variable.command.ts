import { OrganizationLevelWithUserCommand } from '@novu/application-generic';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DeleteEnvironmentVariableCommand extends OrganizationLevelWithUserCommand {
  @IsString()
  @IsNotEmpty()
  variableKey: string;

  @IsBoolean()
  @IsOptional()
  restrictToUserEnvironment?: boolean;
}
