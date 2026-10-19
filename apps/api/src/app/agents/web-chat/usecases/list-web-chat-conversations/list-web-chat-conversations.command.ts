import { DirectionEnum } from '@novu/shared';
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { EnvironmentWithSubscriber } from '../../../../shared/commands/project.command';

export class ListWebChatConversationsCommand extends EnvironmentWithSubscriber {
  /** Conversation `_id` cursor for forward pagination. */
  @IsOptional()
  @IsString()
  after?: string;

  /** Conversation `_id` cursor for reverse pagination. */
  @IsOptional()
  @IsString()
  before?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;

  @IsIn(['lastActivityAt', 'createdAt'])
  orderBy: 'lastActivityAt' | 'createdAt' = 'lastActivityAt';

  @IsOptional()
  @IsEnum(DirectionEnum)
  orderDirection?: DirectionEnum;

  @IsOptional()
  @IsBoolean()
  includeCursor?: boolean;
}
