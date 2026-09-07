import { EnvironmentTypeEnum } from '@novu/shared';
import { IsBoolean, IsDefined, IsEnum, IsHexColor, IsMongoId, IsOptional, IsString } from 'class-validator';
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

  @IsOptional()
  @IsEnum(EnvironmentTypeEnum)
  type?: EnvironmentTypeEnum;

  @IsBoolean()
  @IsDefined()
  system: boolean;

  @IsBoolean()
  @IsOptional()
  returnApiKeys?: boolean;
}
