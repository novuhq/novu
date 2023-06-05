import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetInternationalizationTranslationCommand extends EnvironmentCommand {
  language: string;
  prompt: string;
}
