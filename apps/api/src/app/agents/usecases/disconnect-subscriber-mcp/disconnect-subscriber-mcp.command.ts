import { IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class DisconnectSubscriberMcpCommand extends EnvironmentCommand {
  @IsString()
  agentIdentifier: string;

  @IsString()
  subscriberId: string;

  @IsString()
  mcpServerName: string;
}
