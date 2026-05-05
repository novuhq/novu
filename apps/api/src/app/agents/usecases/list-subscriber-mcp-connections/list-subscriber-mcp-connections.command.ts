import { IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class ListSubscriberMcpConnectionsCommand extends EnvironmentCommand {
  @IsString()
  agentIdentifier: string;

  @IsString()
  subscriberId: string;
}
