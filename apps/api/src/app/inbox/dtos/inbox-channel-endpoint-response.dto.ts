import { ApiProperty } from '@nestjs/swagger';
import { ChannelEndpointType, ENDPOINT_TYPES } from '@novu/shared';

export class InboxChannelEndpointResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the channel endpoint.',
    type: String,
  })
  identifier: string;

  @ApiProperty({
    description: 'Type of channel endpoint',
    enum: Object.values(ENDPOINT_TYPES),
    example: ENDPOINT_TYPES.SLACK_CHANNEL,
  })
  type: ChannelEndpointType;
}

export class InboxListChannelEndpointsResponseDto {
  @ApiProperty({ type: [InboxChannelEndpointResponseDto] })
  data: InboxChannelEndpointResponseDto[];

  @ApiProperty({ type: String, nullable: true })
  next: string | null;

  @ApiProperty({ type: String, nullable: true })
  previous: string | null;
}
