import { IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class UpdateAnthropicAgentCredentialsCommand extends EnvironmentWithUserCommand {
  @IsString()
  apiKey: string;
}
