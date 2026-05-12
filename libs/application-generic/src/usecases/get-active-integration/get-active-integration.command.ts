import { IsBoolean, IsOptional } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../commands';

export class GetActiveIntegrationsCommand extends EnvironmentWithUserCommand {
  @IsBoolean()
  @IsOptional()
  returnCredentials?: boolean;

  /**
   * When true, restrict the query to integrations within `environmentId` only.
   * Default behavior returns active integrations across every environment of
   * the organization (legacy JWT/session behavior).
   */
  @IsBoolean()
  @IsOptional()
  scopeToEnvironment?: boolean;
}
