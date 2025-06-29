import { IsBoolean, IsDefined, IsEnum, IsOptional, IsString } from 'class-validator';

import { ResourceTypeEnum, ResourceOriginEnum } from '@novu/shared';
import { LayoutDescription, LayoutName, LayoutVariables, LayoutIdentifier } from '../../types';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

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
