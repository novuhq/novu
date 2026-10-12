import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { INBOX_THREAD_INCLUDES, type InboxThreadInclude } from '../../dtos/human-inbox.dto';
import { InboxThreadCommand } from '../inbox-thread.command';

export class GetInboxThreadCommand extends InboxThreadCommand {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  before?: string;

  @IsOptional()
  @IsIn(INBOX_THREAD_INCLUDES)
  include?: InboxThreadInclude;
}
