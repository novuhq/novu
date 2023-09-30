import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { IsArray, IsOptional, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetFeedCountCommand extends EnvironmentWithSubscriber {
  @IsOptional()
  @IsArray()
  feedId?: string[];

  @IsOptional()
  seen?: boolean;

  @IsOptional()
  read?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (isNaN(value) || value == null) {
      return 100;
    }

    return value;
  })
  @Min(1)
  @Max(1000)
  limit: number;
}
