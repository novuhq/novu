import { IsArray, IsDefined } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class MarkMessageAsCommand extends EnvironmentWithSubscriber {
  @IsArray()
  messageIds: string[];

  @IsDefined()
  mark: MarkEnum;
}

export enum MarkEnum {
  SEEN = 'seen',
  READ = 'read',
}
