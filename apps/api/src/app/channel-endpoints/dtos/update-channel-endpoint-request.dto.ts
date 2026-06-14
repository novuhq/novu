import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { IsDefined, IsObject } from 'class-validator';
import {
  PhoneEndpointDto,
  SlackChannelEndpointDto,
  SlackUserEndpointDto,
  WebexPersonEndpointDto,
  WebexRoomEndpointDto,
  WebhookEndpointDto,
} from './endpoint-types.dto';

export class UpdateChannelEndpointRequestDto {
  @ApiProperty({
    description: 'Updated endpoint data. The structure must match the existing channel endpoint type.',
    oneOf: [
      { $ref: getSchemaPath(SlackChannelEndpointDto) },
      { $ref: getSchemaPath(SlackUserEndpointDto) },
      { $ref: getSchemaPath(WebhookEndpointDto) },
      { $ref: getSchemaPath(PhoneEndpointDto) },
      { $ref: getSchemaPath(WebexRoomEndpointDto) },
      { $ref: getSchemaPath(WebexPersonEndpointDto) },
    ],
  })
  @IsDefined()
  @IsObject()
  endpoint:
    | SlackChannelEndpointDto
    | SlackUserEndpointDto
    | WebhookEndpointDto
    | PhoneEndpointDto
    | WebexRoomEndpointDto
    | WebexPersonEndpointDto;
}
