import { IsArray, IsBoolean, IsDefined, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { NotificationFilter } from '../../utils/types';

class Filter implements NotificationFilter {
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
}

export class UpdateAllNotificationsCommand extends EnvironmentWithSubscriber {
  @IsDefined()
  @ValidateNested()
  @Type(() => Filter)
  readonly from: Filter;

  @IsDefined()
  @ValidateNested()
  @Type(() => Filter)
  readonly to: Filter;
}
