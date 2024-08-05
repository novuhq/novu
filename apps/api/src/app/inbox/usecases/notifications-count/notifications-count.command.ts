import { IsArray, IsBoolean, IsDefined, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { NotificationFilter } from '../../utils/types';

class NotificationsFilter implements NotificationFilter {
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

export class NotificationsCountCommand extends EnvironmentWithSubscriber {
  @IsDefined()
  @IsArray()
  filters: NotificationsFilter[];
}
