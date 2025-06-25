import { IsBoolean, IsDefined, IsEnum, IsOptional, IsString } from 'class-validator';
import { ResourceTypeEnum, ResourceOriginEnum } from '@novu/shared';

import { LayoutDescription, LayoutId, LayoutIdentifier, LayoutName, LayoutVariables } from '../../types';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class UpdateLayoutCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  layoutId: LayoutId;

  @IsString()
  @IsOptional()
  name?: LayoutName;

  @IsString()
  @IsOptional()
  identifier?: LayoutIdentifier;

  @IsString()
  @IsOptional()
  description?: LayoutDescription;

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
