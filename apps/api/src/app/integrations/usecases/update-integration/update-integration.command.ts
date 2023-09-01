import { IsDefined, IsMongoId, IsOptional, IsString } from 'class-validator';
import { ICredentialsDto } from '@novu/shared';

import { OrganizationCommand } from '../../../shared/commands/organization.command';
import { StepFilter } from '../../../shared/dtos/step-filter';

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
  active?: boolean;

  @IsOptional()
  check?: boolean;

  @IsOptional()
  conditions?: StepFilter[];
}
