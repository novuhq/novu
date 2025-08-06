import { BadRequestException } from '@nestjs/common';
import { plainToClass, Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsDefined, IsOptional, IsString, ValidateNested } from 'class-validator';
import { NotificationFilter } from '../utils/types';

export class NotificationsFilter implements NotificationFilter {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

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
}

export class GetNotificationsCountRequestDto {
  @IsDefined()
  @Transform(({ value }) => {
    try {
      const filters = JSON.parse(value);
      if (Array.isArray(filters)) {
        return filters.map((el) => plainToClass(NotificationsFilter, el));
      }

      return filters;
    } catch (e) {
      throw new BadRequestException('Invalid filters, the JSON object should be provided.');
    }
  })
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => NotificationsFilter)
  filters: NotificationsFilter[];
}
