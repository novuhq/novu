import { LayoutId, ResourceOriginEnum, ResourceTypeEnum } from '@novu/shared';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { EnvironmentCommand } from '../../commands/project.command';

export class GetLayoutCommand extends EnvironmentCommand {
  @IsString()
  @IsOptional()
  layoutIdOrInternalId?: LayoutId;

  @IsEnum(ResourceTypeEnum)
  @IsOptional()
  type?: ResourceTypeEnum;

  @IsEnum(ResourceOriginEnum)
  @IsOptional()
  origin?: ResourceOriginEnum;
}
