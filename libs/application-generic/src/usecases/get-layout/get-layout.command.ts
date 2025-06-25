import { IsDefined, IsEnum, IsOptional, IsString } from 'class-validator';
import { LayoutId, ResourceOriginEnum, ResourceTypeEnum } from '@novu/shared';

import { EnvironmentCommand } from '../../commands/project.command';

export class GetLayoutCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  layoutIdOrInternalId: LayoutId;

  @IsEnum(ResourceTypeEnum)
  @IsOptional()
  type?: ResourceTypeEnum;

  @IsEnum(ResourceOriginEnum)
  @IsOptional()
  origin?: ResourceOriginEnum;
}
