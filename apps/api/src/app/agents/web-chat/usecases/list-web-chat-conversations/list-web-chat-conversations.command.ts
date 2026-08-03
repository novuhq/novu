import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { EnvironmentWithSubscriber } from '../../../../shared/commands/project.command';

export class ListWebChatConversationsCommand extends EnvironmentWithSubscriber {
  /** Cursor: conversation `_id` — fetch conversations after this id (forward pagination). */
  @IsOptional()
  @IsString()
  after?: string;

  /** Cursor: conversation `_id` — fetch conversations before this id (reverse pagination). */
  @IsOptional()
  @IsString()
  before?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}
