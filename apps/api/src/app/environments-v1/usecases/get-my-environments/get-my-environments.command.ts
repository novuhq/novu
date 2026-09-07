import { BaseCommand } from '@novu/application-generic';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class GetMyEnvironmentsCommand extends BaseCommand {
  @IsNotEmpty()
  readonly organizationId: string;

  @IsOptional()
  readonly environmentId: string;

  @IsOptional()
  readonly returnApiKeys: boolean;

  /**
   * When set, decrypted API keys are only returned for the environment whose
   * `_id` matches this value. Used to scope API-key callers to their own
   * environment while still letting session-token (dashboard) callers see all.
   */
  @IsOptional()
  readonly apiKeysEnvironmentId?: string;

  @IsOptional()
  readonly userId: string;
}
