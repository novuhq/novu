import { IsString, IsIn } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class TranslateMessageCommand extends EnvironmentCommand {
  @IsString()
  messageContent: string;

  @IsIn(['French', 'Japanese', 'Spanish', 'es-ES'])
  language: 'French' | 'Japanese' | 'Spanish' | 'es-ES';
}
