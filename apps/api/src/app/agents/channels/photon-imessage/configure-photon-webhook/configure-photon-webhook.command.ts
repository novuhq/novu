import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../../shared/commands/project.command';

export class ConfigurePhotonWebhookCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  /**
   * Recreate the registration even when it looks intact. Photon issues the signing
   * secret only once, so this is the recovery path when the stored secret went stale
   * (e.g. the webhook was deleted and re-added in the Photon dashboard).
   */
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
