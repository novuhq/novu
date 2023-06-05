import { IsString, IsIn } from 'class-validator';
import { EnvironmentCommand } from '../../commands';

export class TranslateMessageCommand {
  @IsString()
  messageContent: string;

  @IsString()
  language: string;
}
