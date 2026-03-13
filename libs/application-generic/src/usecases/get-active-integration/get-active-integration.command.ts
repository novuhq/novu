import { IsBoolean, IsOptional } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../commands';

export class GetActiveIntegrationsCommand extends EnvironmentWithUserCommand {
  @IsBoolean()
  @IsOptional()
  returnCredentials?: boolean;
}
