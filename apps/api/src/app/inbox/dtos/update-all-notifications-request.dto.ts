import { IsArray, IsOptional, IsString } from 'class-validator';

import type { NotificationFilter } from '../utils/types';

export class UpdateAllNotificationsRequestDto implements Pick<NotificationFilter, 'tags'> {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
