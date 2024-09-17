import { IsArray, IsDefined, IsMongoId, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ICredentialsDto } from '@novu/shared';
import { MessageFilter } from '@novu/application-generic';

import { OrganizationCommand } from '../../../shared/commands/organization.command';

export class UpdateIntegrationCommand extends OrganizationCommand {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  identifier?: string;

  @IsOptional()
  @IsMongoId()
  environmentId?: string;

  @IsOptional()
  @IsMongoId()
  userEnvironmentId: string;

  @IsDefined()
  integrationId: string;

  @IsOptional()
  credentials?: ICredentialsDto;

  @IsOptional()
  removeNovuBranding?: boolean;

  @IsOptional()
  active?: boolean;

  @IsOptional()
  check?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  conditions?: MessageFilter[];
}
