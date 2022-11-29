import { IsDefined, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class CancelDelayedCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  transactionId: string;
}
