import {
  CreatePhoneEndpointDto,
  CreateSlackChannelEndpointDto,
  CreateSlackUserEndpointDto,
  CreateWebhookEndpointDto,
} from './create-channel-endpoint-variants.dto';

export type CreateChannelEndpointRequest =
  | CreateSlackChannelEndpointDto
  | CreateSlackUserEndpointDto
  | CreateWebhookEndpointDto
  | CreatePhoneEndpointDto;
