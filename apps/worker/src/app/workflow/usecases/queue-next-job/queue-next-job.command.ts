import { IsDefined } from 'class-validator';
import { EnvironmentWithUserCommand } from '@novu/application-generic';

export class QueueNextJobCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  parentId: string;
}
