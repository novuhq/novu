import { SeverityLevelEnum, type TagsFilter } from '@novu/shared';
import { IsBoolean, IsDefined, IsInt, IsMongoId, IsOptional, IsString, Max, Min } from 'class-validator';

import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { CursorPaginationParams } from '../../../shared/types';
import { IsEnumOrArray } from '../../../shared/validators/is-enum-or-array';
import { IsTagsFilter } from '../../validators/is-tags-filter.validator';

export class GetNotificationsCommand extends EnvironmentWithSubscriber implements CursorPaginationParams {
  @IsInt()
  @Min(1)
  @Max(100)
  readonly limit: number;

  @IsOptional()
  @IsMongoId()
  readonly after?: string;

  @IsDefined()
  @IsInt()
  @Min(0)
  readonly offset: number;

  @IsOptional()
  @IsTagsFilter()
  readonly tags?: TagsFilter;

  @IsOptional()
  @IsBoolean()
  readonly read?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly archived?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly snoozed?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly seen?: boolean;

  @IsOptional()
  @IsString()
  readonly data?: string;

  @IsOptional()
  @IsEnumOrArray(SeverityLevelEnum)
  readonly severity?: SeverityLevelEnum | SeverityLevelEnum[];

  @IsOptional()
  @IsInt()
  readonly createdGte?: number;

  @IsOptional()
  @IsInt()
  readonly createdLte?: number;
}
