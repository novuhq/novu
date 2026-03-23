import { ApiPropertyOptional } from '@nestjs/swagger';

export class ChannelCredentials {
  @ApiPropertyOptional({
    description:
      'Webhook URL used by chat app integrations. The webhook should be obtained from the chat app provider.',
    example: 'https://example.com/webhook',
    type: String,
  })
  webhookUrl?: string;

  @ApiPropertyOptional({
    description: 'Channel specification for Mattermost chat notifications.',
    example: 'general',
    type: String,
  })
  channel?: string;

  @ApiPropertyOptional({
    description: 'Contains an array of the subscriber device tokens for a given provider. Used on Push integrations.',
    example: ['token1', 'token2', 'token3'],
    type: [String],
  })
  deviceTokens?: string[];

  @ApiPropertyOptional({
    description: 'Alert UID for Grafana on-call webhook payload.',
    example: '12345-abcde',
    type: String,
  })
  alertUid?: string;

  @ApiPropertyOptional({
    description: 'Title to be used with Grafana on-call webhook.',
    example: 'Critical Alert',
    type: String,
  })
  title?: string;

  @ApiPropertyOptional({
    description: 'Image URL property for Grafana on-call webhook.',
    example: 'https://example.com/image.png',
    type: String,
  })
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'State property for Grafana on-call webhook.',
    example: 'resolved',
    type: String,
  })
  state?: string;

  @ApiPropertyOptional({
    description: 'Link to upstream details property for Grafana on-call webhook.',
    example: 'https://example.com/details',
    type: String,
  })
  externalUrl?: string;
}
