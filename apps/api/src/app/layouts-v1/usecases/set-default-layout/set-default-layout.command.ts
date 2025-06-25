import { IsDefined, IsEnum, IsOptional, IsString } from 'class-validator';

import { ResourceOriginEnum, ResourceTypeEnum } from '@novu/shared';
import { LayoutId } from '../../types';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class SetDefaultLayoutCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  layoutId: LayoutId;

  @IsEnum(ResourceTypeEnum)
  @IsOptional()
  type?: ResourceTypeEnum;

  @IsEnum(ResourceOriginEnum)
  @IsOptional()
  origin?: ResourceOriginEnum;
}
