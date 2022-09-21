import { IsArray, IsNumber, IsOptional } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { StoreQuery } from '../../querys/store.query';

export class GetNotificationsFeedCommand extends EnvironmentWithSubscriber {
  @IsNumber()
  page: number;

  @IsOptional()
  @IsArray()
  feedId: string[];

  @IsOptional()
  query?: StoreQuery;
}
