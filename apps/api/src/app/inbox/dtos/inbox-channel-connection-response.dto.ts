import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InboxChannelConnectionWorkspaceDto {
  @ApiProperty({ description: 'The provider workspace/team id.', type: String })
  id: string;

  @ApiPropertyOptional({ description: 'The provider workspace/team display name.', type: String })
  name?: string;

  @ApiPropertyOptional({ description: 'The provider workspace/team bot user id.', type: String })
  botUserId?: string;
}

export class InboxChannelConnectionResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the channel connection.',
    type: String,
  })
  identifier: string;

  @ApiPropertyOptional({
    description: 'The provider workspace this connection is bound to.',
    type: InboxChannelConnectionWorkspaceDto,
  })
  workspace?: InboxChannelConnectionWorkspaceDto;

  @ApiPropertyOptional({
    description: 'ISO timestamp of when the connection was created.',
    type: String,
  })
  createdAt?: string;
}

export class InboxListChannelConnectionsResponseDto {
  @ApiProperty({ type: [InboxChannelConnectionResponseDto] })
  data: InboxChannelConnectionResponseDto[];

  @ApiProperty({ type: String, nullable: true })
  next: string | null;

  @ApiProperty({ type: String, nullable: true })
  previous: string | null;
}
