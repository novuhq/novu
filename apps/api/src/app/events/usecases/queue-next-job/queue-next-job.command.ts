import { IsDefined } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class QueueNextJobCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  parentId: string;
}
