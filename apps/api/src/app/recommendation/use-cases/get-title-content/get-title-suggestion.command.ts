import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetTitleSuggestionCommand extends EnvironmentCommand {
  titles: string[];
  description: string;
  language: string;
}
