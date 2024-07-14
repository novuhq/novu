import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { IsArray } from 'class-validator';

export class ProcessBulkCancelCommand extends EnvironmentWithUserCommand {
  @IsArray()
  transactionIds: string[];
}
