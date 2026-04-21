import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { SeverityLevelEnum, type TagsFilter } from '@novu/shared';
import { plainToClass, Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsDefined, IsOptional, IsString, ValidateNested } from 'class-validator';
import { NotificationFilter } from '../../inbox/utils/types';
import { IsTagsFilter } from '../../inbox/validators/is-tags-filter.validator';
import { IsEnumOrArray } from '../../shared/validators/is-enum-or-array';

export class SubscriberNotificationsFilter implements NotificationFilter {
  @IsOptional()
  @IsTagsFilter()
  tags?: TagsFilter;

  @IsOptional()
  @IsBoolean()
  read?: boolean;

  @IsOptional()
  @IsBoolean()
  archived?: boolean;

  @IsOptional()
  @IsBoolean()
  snoozed?: boolean;

  @IsOptional()
  @IsBoolean()
  seen?: boolean;

  @IsOptional()
  @IsEnumOrArray(SeverityLevelEnum)
  severity?: SeverityLevelEnum | SeverityLevelEnum[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contextKeys?: string[];
}

export class GetSubscriberNotificationsCountQueryDto {
  @IsDefined()
  @Transform(({ value }) => {
    try {
      const filters = JSON.parse(value);
      if (Array.isArray(filters)) {
        return filters.map((el) => plainToClass(SubscriberNotificationsFilter, el));
      }

      return filters;
    } catch {
      throw new BadRequestException('Invalid filters, the JSON object should be provided.');
    }
  })
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => SubscriberNotificationsFilter)
  @ApiProperty({
    description: 'Array of filter objects (max 30) to count notifications by different criteria',
    type: 'string',
    example:
      '[{"read":false,"archived":false},{"tags":["important"]},{"tags":{"and":[{"or":["a","b"]},{"or":["c"]}]}}]',
  })
  filters: SubscriberNotificationsFilter[];
}
