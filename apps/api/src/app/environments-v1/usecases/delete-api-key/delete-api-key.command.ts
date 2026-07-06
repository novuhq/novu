import { IsNotEmpty, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class DeleteApiKeyCommand extends EnvironmentWithUserCommand {
  @IsNotEmpty()
  @IsString()
  readonly hash: string;
}
