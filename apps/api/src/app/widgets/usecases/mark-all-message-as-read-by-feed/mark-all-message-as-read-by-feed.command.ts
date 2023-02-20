import { IsOptional, IsString } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class MarkAllMessageAsReadByFeedCommand extends EnvironmentWithSubscriber {
  @IsString()
  @IsOptional()
  feedId?: string;
}
