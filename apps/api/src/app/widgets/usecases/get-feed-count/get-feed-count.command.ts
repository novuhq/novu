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
      // todo update the limit default to 100 to in version 0.16
      return 1000;
    }

    return value;
  })
  @Min(1)
  @Max(1000)
  limit?: number;
}
