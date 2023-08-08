import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { StoreQuery } from '../../queries/store.query';

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
}
