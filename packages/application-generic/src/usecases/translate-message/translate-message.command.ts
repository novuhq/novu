import { IsString, IsIn } from 'class-validator';
import { EnvironmentCommand } from '../../commands';

export class TranslateMessageCommand extends EnvironmentCommand {
  @IsString()
  messageContent: string;

  @IsString()
  language: string;
}
