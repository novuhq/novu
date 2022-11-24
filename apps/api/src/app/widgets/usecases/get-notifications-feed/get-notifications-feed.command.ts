import { IsArray, IsNumber, IsOptional } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { StoreQuery } from '../../queries/store.query';

export class GetNotificationsFeedCommand extends EnvironmentWithSubscriber {
  @IsNumber()
  @IsOptional()
  page?: number = 0;

  @IsOptional()
  @IsArray()
  feedId: string[];

  @IsOptional()
  query?: StoreQuery;
}
