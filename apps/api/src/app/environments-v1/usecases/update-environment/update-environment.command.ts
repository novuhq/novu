import { IsDefined, IsMongoId, IsOptional, IsString } from 'class-validator';
import { OrganizationCommand } from '../../../shared/commands/organization.command';

export class UpdateEnvironmentCommand extends OrganizationCommand {
  @IsDefined()
  @IsMongoId()
  environmentId: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  identifier?: string;

  @IsOptional()
  @IsString()
  @IsMongoId()
  _parentId?: string;

  @IsOptional()
  dns?: { inboundParseDomain?: string };

  @IsOptional()
  bridge?: { url?: string };
}
