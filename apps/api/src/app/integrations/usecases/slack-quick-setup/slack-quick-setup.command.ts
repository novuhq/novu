import { IsDefined, IsMongoId, IsOptional, IsString } from 'class-validator';

import { OrganizationCommand } from '../../../shared/commands/organization.command';

export class SlackQuickSetupCommand extends OrganizationCommand {
  @IsDefined()
  @IsMongoId()
  environmentId: string;

  @IsDefined()
  @IsMongoId()
  integrationId: string;

  /** Omitted for a notifications app, which has no agent webhook. */
  @IsOptional()
  @IsMongoId()
  agentId?: string;

  @IsDefined()
  @IsString()
  configToken: string;

  /** Overrides the integration name as the Slack app's name. */
  @IsOptional()
  @IsString()
  appName?: string;

  @IsOptional()
  @IsString()
  subscriberId?: string;

  @IsOptional()
  @IsString()
  connectionIdentifier?: string;
}
