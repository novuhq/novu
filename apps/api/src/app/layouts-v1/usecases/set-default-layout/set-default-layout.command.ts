import { ResourceOriginEnum, ResourceTypeEnum } from '@novu/shared';
import { IsDefined, IsEnum, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { LayoutId } from '../../types';

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
