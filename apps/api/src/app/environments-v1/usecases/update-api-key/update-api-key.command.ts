import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateApiKeyCommand extends EnvironmentWithUserCommand {
  @IsNotEmpty()
  @IsString()
  readonly apiKey: string;
}
