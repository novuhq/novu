import { IsBoolean, IsDefined, IsHexColor, IsMongoId, IsOptional, IsString } from 'class-validator';
import { OrganizationCommand } from '../../../shared/commands/organization.command';

export class CreateEnvironmentCommand extends OrganizationCommand {
  @IsDefined()
  @IsString()
  name: string;

  @IsOptional()
  @IsMongoId()
  parentEnvironmentId?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsBoolean()
  @IsDefined()
  system: boolean;
}
