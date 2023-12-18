import { IsArray, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { StoreQuery } from '../../queries/store.query';
import { NotificationTemplateEntity } from '@novu/dal';
// import { NotificationTemplateEntity } from 'libs/dal/dist/repositories/notification-template';

export class GetNotificationsFeedCommand extends EnvironmentWithSubscriber {
  @IsNumber()
  @IsOptional()
  page = 0;

  @IsNumber()
  @IsOptional()
  limit = 10;

  @IsOptional()
  @IsArray()
  feedId?: string[];

  @IsOptional()
  query: StoreQuery;

  @IsOptional()
  @IsString()
  payload?: string;

  @IsOptional()
  @IsObject()
  template?: NotificationTemplateEntity;
}
