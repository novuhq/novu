import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { IsBoolean, IsOptional } from 'class-validator';

export class GetIntegrationsCommand extends EnvironmentWithUserCommand {
  @IsBoolean()
  @IsOptional()
  returnCredentials?: boolean;

  /**
   * When true, restrict the query to integrations within `environmentId` only.
   * Default behavior returns integrations across every environment of the
   * organization (legacy JWT/session behavior).
   */
  @IsBoolean()
  @IsOptional()
  scopeToEnvironment?: boolean;
}
