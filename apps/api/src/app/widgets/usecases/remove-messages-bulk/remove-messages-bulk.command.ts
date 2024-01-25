import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsDefined, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class RemoveMessagesBulkCommand extends EnvironmentWithSubscriber {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @ArrayMaxSize(100)
  messageIds: string[];
}
