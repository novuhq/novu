import { EnvironmentCommand } from '../../commands/project.command';

export class CalculateDemoClaudeQuotaCommand extends EnvironmentCommand {
  /** When set, also evaluates per-conversation token usage against the hard cap. */
  conversationId?: string;
}
