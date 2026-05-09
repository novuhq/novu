import { IsNotEmpty, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GenerateAzureSetupOauthUrlCommand extends EnvironmentWithUserCommand {
  @IsNotEmpty()
  @IsString()
  readonly integrationId: string;
}
