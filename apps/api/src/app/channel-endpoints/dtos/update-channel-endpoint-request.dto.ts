import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { IsDefined, IsObject } from 'class-validator';
import {
  ClickUpChannelEndpointDto,
  MsTeamsChannelEndpointDto,
  MsTeamsUserEndpointDto,
  PhoneEndpointDto,
  SlackChannelEndpointDto,
  SlackUserEndpointDto,
  WebhookEndpointDto,
} from './endpoint-types.dto';

export class UpdateChannelEndpointRequestDto {
  @ApiProperty({
    description: 'Updated endpoint data. The structure must match the existing channel endpoint type.',
    oneOf: [
      { $ref: getSchemaPath(ClickUpChannelEndpointDto) },
      { $ref: getSchemaPath(SlackChannelEndpointDto) },
      { $ref: getSchemaPath(SlackUserEndpointDto) },
      { $ref: getSchemaPath(WebhookEndpointDto) },
      { $ref: getSchemaPath(PhoneEndpointDto) },
      { $ref: getSchemaPath(MsTeamsChannelEndpointDto) },
      { $ref: getSchemaPath(MsTeamsUserEndpointDto) },
    ],
  })
  @IsDefined()
  @IsObject()
  endpoint:
    | ClickUpChannelEndpointDto
    | SlackChannelEndpointDto
    | SlackUserEndpointDto
    | WebhookEndpointDto
    | PhoneEndpointDto
    | MsTeamsChannelEndpointDto
    | MsTeamsUserEndpointDto;
}
