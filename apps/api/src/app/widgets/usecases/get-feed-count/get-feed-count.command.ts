import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { IsArray, IsOptional } from 'class-validator';

export class GetFeedCountCommand extends EnvironmentWithSubscriber {
  @IsOptional()
  @IsArray()
  feedId: string[];

  @IsOptional()
  seen?: boolean;

  @IsOptional()
  read?: boolean;
}
