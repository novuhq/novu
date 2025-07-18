import { IsOptional, IsString, ValidateNested, IsEnum, IsNotEmpty, Length } from 'class-validator';
import { Type } from 'class-transformer';

import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { MAX_NAME_LENGTH } from '@novu/shared';
import { LayoutCreationSourceEnum } from '../../types';
import { LayoutControlValuesDto } from '../../dtos/layout-controls.dto';

export class UpsertLayoutDataCommand {
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
}
