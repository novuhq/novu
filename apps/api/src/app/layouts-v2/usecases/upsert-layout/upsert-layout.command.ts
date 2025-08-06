import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { MAX_NAME_LENGTH } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, Length, ValidateNested } from 'class-validator';
import { LayoutControlValuesDto } from '../../dtos/layout-controls.dto';
import { LayoutCreationSourceEnum } from '../../types';

export class UpsertLayoutDataCommand {
  @IsString()
  @IsOptional()
  layoutId?: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, MAX_NAME_LENGTH)
  name: string;

  @IsOptional()
  @IsEnum(LayoutCreationSourceEnum)
  __source?: LayoutCreationSourceEnum;

  @IsOptional()
  controlValues?: LayoutControlValuesDto | null;
}

export class UpsertLayoutCommand extends EnvironmentWithUserCommand {
  @ValidateNested()
  @Type(() => UpsertLayoutDataCommand)
  layoutDto: UpsertLayoutDataCommand;

  @IsOptional()
  @IsString()
  layoutIdOrInternalId?: string;

  @IsOptional()
  @IsBoolean()
  preserveLayoutId?: boolean;
}
