import {
  CreateLineUserEndpointDto,
  CreateMsTeamsChannelEndpointDto,
  CreateMsTeamsUserEndpointDto,
  CreatePhoneEndpointDto,
  CreateSlackChannelEndpointDto,
  CreateSlackUserEndpointDto,
  CreateTelegramChatEndpointDto,
  CreateToolWebhookEndpointDto,
  CreateWebexPersonEndpointDto,
  CreateWebexRoomEndpointDto,
  CreateWebhookEndpointDto,
} from './create-channel-endpoint-variants.dto';

export type CreateChannelEndpointRequest =
  | CreateSlackChannelEndpointDto
  | CreateSlackUserEndpointDto
  | CreateWebhookEndpointDto
  | CreatePhoneEndpointDto
  | CreateMsTeamsChannelEndpointDto
  | CreateMsTeamsUserEndpointDto
  | CreateTelegramChatEndpointDto
  | CreateWebexRoomEndpointDto
  | CreateWebexPersonEndpointDto
  | CreateLineUserEndpointDto
  | CreateToolWebhookEndpointDto;
