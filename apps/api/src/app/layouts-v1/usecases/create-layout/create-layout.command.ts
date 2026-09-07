import { ResourceOriginEnum, ResourceTypeEnum } from '@novu/shared';
import { IsBoolean, IsDefined, IsEnum, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { LayoutDescription, LayoutIdentifier, LayoutName, LayoutVariables } from '../../types';

export class CreateLayoutCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  name: LayoutName;

  @IsString()
  @IsDefined()
  identifier: LayoutIdentifier;

  @IsString()
  @IsOptional()
  description?: LayoutDescription;

  @IsString()
  @IsOptional()
  content?: string;

  @IsOptional()
  variables?: LayoutVariables;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsOptional()
  @IsEnum(ResourceTypeEnum)
  type?: ResourceTypeEnum;

  @IsOptional()
  @IsEnum(ResourceOriginEnum)
  origin?: ResourceOriginEnum;
}
