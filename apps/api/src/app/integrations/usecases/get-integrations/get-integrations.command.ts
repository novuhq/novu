import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { IsBoolean, IsOptional } from 'class-validator';

export class GetIntegrationsCommand extends EnvironmentWithUserCommand {
  @IsBoolean()
  @IsOptional()
  returnCredentials?: boolean;
}
