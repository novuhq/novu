import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetNodeTranslationCommand extends EnvironmentCommand {
  prompt: string;
  dstLanguage: string;
}
