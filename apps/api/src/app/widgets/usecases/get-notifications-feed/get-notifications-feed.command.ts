import { IsArray, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { StoreQuery } from '../../queries/store.query';
import { Transform } from 'class-transformer';

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
}
