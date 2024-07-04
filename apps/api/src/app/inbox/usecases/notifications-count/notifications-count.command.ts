import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { NotificationFilter } from '../../utils/types';

export class NotificationsCountCommand extends EnvironmentWithSubscriber implements NotificationFilter {
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
