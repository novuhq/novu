import { IsDefined, IsMongoId, IsOptional, IsString, ValidateNested } from 'class-validator';
import { OrganizationCommand } from '../../../shared/commands/organization.command';

export class UpdateEnvironmentCommand extends OrganizationCommand {
  @IsDefined()
  @IsMongoId()
  _id: string;

  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  identifier: string;

  @IsOptional()
  @IsString()
  @IsMongoId()
  _parentId: string;
}
