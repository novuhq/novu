import { MessageFilter } from '@novu/application-generic';
import { IConfigurations, ICredentialsDto } from '@novu/shared';
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

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
  active?: boolean;

  @IsOptional()
  check?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  conditions?: MessageFilter[];

  @IsOptional()
  @IsObject()
  configurations?: IConfigurations;

  /**
   * When true, the existing integration must belong to `userEnvironmentId` for the
   * update to succeed. Used when the request is authenticated with an API key, since
   * an API key is bound to a single environment and must not be able to mutate
   * integrations that live in a different environment of the same organization.
   */
  @IsOptional()
  @IsBoolean()
  restrictToUserEnvironment?: boolean;
}
