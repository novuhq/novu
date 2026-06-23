import { ApiProperty } from '@nestjs/swagger';

export class InboxChannelConnectionResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the channel connection.',
    type: String,
  })
  identifier: string;
}

export class InboxListChannelConnectionsResponseDto {
  @ApiProperty({ type: [InboxChannelConnectionResponseDto] })
  data: InboxChannelConnectionResponseDto[];

  @ApiProperty({ type: String, nullable: true })
  next: string | null;

  @ApiProperty({ type: String, nullable: true })
  previous: string | null;
}
