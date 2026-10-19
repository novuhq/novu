import { IsDefined, IsMongoId, IsOptional, IsString } from 'class-validator';

import { OrganizationCommand } from '../../../shared/commands/organization.command';

export class SlackQuickSetupCommand extends OrganizationCommand {
  @IsDefined()
  @IsMongoId()
  environmentId: string;

  @IsDefined()
  @IsMongoId()
  integrationId: string;

  @IsDefined()
  @IsMongoId()
  agentId: string;

  @IsDefined()
  @IsString()
  configToken: string;

  @IsOptional()
  @IsString()
  subscriberId?: string;

  @IsOptional()
  @IsString()
  connectionIdentifier?: string;
}
