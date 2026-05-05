import { IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class IssueMcpConnectLinkCommand extends EnvironmentWithUserCommand {
  @IsString()
  agentIdentifier: string;

  @IsString()
  conversationId: string;

  @IsString()
  subscriberId: string;

  @IsString()
  mcpServerName: string;
}
