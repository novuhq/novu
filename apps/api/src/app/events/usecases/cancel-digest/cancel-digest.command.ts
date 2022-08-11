import { IsDefined, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class CancelDigestCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  transactionId: string;
}
