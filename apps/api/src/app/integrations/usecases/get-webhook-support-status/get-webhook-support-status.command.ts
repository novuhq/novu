import { IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetWebhookSupportStatusCommand extends EnvironmentWithUserCommand {
  @IsString()
  providerOrIntegrationId: string;
}
