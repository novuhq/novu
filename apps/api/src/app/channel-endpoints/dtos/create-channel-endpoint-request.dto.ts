import {
  CreateMsTeamsChannelEndpointDto,
  CreateMsTeamsUserEndpointDto,
  CreatePhoneEndpointDto,
  CreateSlackChannelEndpointDto,
  CreateSlackUserEndpointDto,
  CreateTelegramChatEndpointDto,
  CreateLineUserEndpointDto,
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
  | CreateLineUserEndpointDto;
