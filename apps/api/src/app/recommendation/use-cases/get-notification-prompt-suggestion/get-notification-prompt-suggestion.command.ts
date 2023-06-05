import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetNotificationPromptSuggestionCommand extends EnvironmentCommand {
  prompt: string;
  limit: number;
}
