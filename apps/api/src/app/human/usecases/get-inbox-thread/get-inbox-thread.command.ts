import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
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
}
