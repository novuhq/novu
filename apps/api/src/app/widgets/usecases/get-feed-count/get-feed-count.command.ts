import { IsArray, IsOptional } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class GetFeedCountCommand extends EnvironmentWithSubscriber {
  @IsOptional()
  @IsArray()
  feedId: string[];

  @IsOptional()
  seen?: boolean;

  @IsOptional()
  read?: boolean;
}
