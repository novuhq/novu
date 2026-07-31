import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class WebChatConversationMetadataDto {
  identifier: string;
  title: string;
  status: string;
  agentIdentifier: string;
  lastActivityAt: string;
  createdAt: string;
}

export class ListWebChatConversationsQueryDto {
  /** Cursor: conversation `_id` for forward pagination. */
  @IsOptional()
  @IsString()
  after?: string;

  /** Cursor: conversation `_id` for reverse pagination. */
  @IsOptional()
  @IsString()
  before?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ListWebChatConversationsResponseDto {
  data: WebChatConversationMetadataDto[];
  next: string | null;
  previous: string | null;
  totalCount: number;
  totalCountCapped: boolean;
}
