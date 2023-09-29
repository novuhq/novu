import { IsOptional, IsString } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class RemoveAllMessagesCommand extends EnvironmentWithSubscriber {
  @IsString()
  @IsOptional()
  feedId?: string;
}
