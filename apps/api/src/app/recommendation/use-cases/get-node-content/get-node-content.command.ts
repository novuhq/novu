import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetNodeContentCommand extends EnvironmentCommand {
  title?: string;
  description?: string;
  prompt?: string;
  channel: string;
}

export class GetAdvancedNodeContentCommand extends EnvironmentCommand {
  title?: string;
  description?: string;
  prompt?: string;
  channel: string;
  messages: string[];
}
