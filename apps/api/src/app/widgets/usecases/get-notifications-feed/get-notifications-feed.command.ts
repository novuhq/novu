import { IsArray, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { StoreQuery } from '../../queries/store.query';
import { Transform } from 'class-transformer';

export class GetNotificationsFeedCommand extends EnvironmentWithSubscriber {
  @IsNumber()
  @IsOptional()
  page = 0;

  @IsOptional()
  @IsArray()
  feedId?: string[];

  @IsOptional()
  query: StoreQuery;

  @IsOptional()
  @Transform(({ value }) => {
    if (isNaN(value) || value == null) {
      // todo update the limit default to 100 to in version 0.16
      return 1000;
    }

    return value;
  })
  @Min(1)
  @Max(1000)
  countLimit?: number;
}
