import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsMongoId } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class RemoveMessagesBulkCommand extends EnvironmentWithSubscriber {
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  @ArrayMaxSize(100)
  messageIds: string[];
}
