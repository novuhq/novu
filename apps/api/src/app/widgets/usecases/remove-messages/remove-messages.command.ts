import { IsOptional, IsString } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class RemoveMessagesCommand extends EnvironmentWithSubscriber {
  @IsString()
  @IsOptional()
  feedId?: string;
}
