import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { InboxThreadCommand } from '../inbox-thread.command';

export class ReplyInboxThreadCommand extends InboxThreadCommand {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  text: string;
}
