import { ResourceOriginEnum, ResourceTypeEnum } from '@novu/shared';
import { IsBoolean, IsDefined, IsEnum, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { LayoutDescription, LayoutId, LayoutIdentifier, LayoutName, LayoutVariables } from '../../types';

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
