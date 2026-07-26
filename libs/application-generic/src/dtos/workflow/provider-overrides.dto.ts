import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

/**
 * Per-provider content overrides for a step, keyed by providerId.
 * Persisted as separate STEP_PROVIDER_CONTROLS documents — not inside step controlValues.
 * Property names match ToolProviderIdEnum and ChatProviderIdEnum values.
 *
 * Providers are enumerated one by one rather than declared as a record so that each one gets its
 * own entry in the OpenAPI document and the generated SDKs.
 */
export class ProviderOverridesDto {
  @ApiPropertyOptional({
    description:
      'PagerDuty content overrides. Merged over the default step body at send time. Supported keys are documented in the PagerDuty override schema.',
    type: 'object',
    additionalProperties: true,
    example: { severity: 'warning', source: 'novu', summary: '{{payload.title}}' },
  })
  @IsObject()
  @IsOptional()
  pagerduty?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      'Opsgenie content overrides. Merged over the default step body at send time. Supported keys are documented in the Opsgenie override schema.',
    type: 'object',
    additionalProperties: true,
    example: { priority: 'P2', message: '{{payload.title}}' },
  })
  @IsObject()
  @IsOptional()
  opsgenie?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Tool webhook content overrides. Free-form: the payload is sent as-is, so any key is accepted.',
    type: 'object',
    additionalProperties: true,
    example: { event: 'incident.triggered', title: '{{payload.title}}' },
  })
  @IsObject()
  @IsOptional()
  'tool-webhook'?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      'Slack content overrides, validated against the Slack chat.postMessage schema. Use `blocks` for Block Kit layouts; `text` falls back to the default step body.',
    type: 'object',
    additionalProperties: true,
    example: { text: '{{payload.title}}', blocks: [{ type: 'divider' }] },
  })
  @IsObject()
  @IsOptional()
  slack?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Discord content overrides. Free-form: any key the Discord webhook API accepts is passed through.',
    type: 'object',
    additionalProperties: true,
    example: { content: '{{payload.title}}', embeds: [{ title: 'Details' }] },
  })
  @IsObject()
  @IsOptional()
  discord?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      'Microsoft Teams content overrides. Free-form: any key the Teams webhook API accepts is passed through.',
    type: 'object',
    additionalProperties: true,
    example: { text: '{{payload.title}}' },
  })
  @IsObject()
  @IsOptional()
  msteams?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Webex Messaging content overrides. Free-form: any key the Webex API accepts is passed through.',
    type: 'object',
    additionalProperties: true,
    example: { text: '{{payload.title}}' },
  })
  @IsObject()
  @IsOptional()
  'webex-messaging'?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      'Mattermost content overrides. Free-form: any key the Mattermost webhook API accepts is passed through.',
    type: 'object',
    additionalProperties: true,
    example: { text: '{{payload.title}}' },
  })
  @IsObject()
  @IsOptional()
  mattermost?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Ryver content overrides. Free-form: any key the Ryver API accepts is passed through.',
    type: 'object',
    additionalProperties: true,
    example: { content: '{{payload.title}}' },
  })
  @IsObject()
  @IsOptional()
  ryver?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Zulip content overrides. Free-form: any key the Zulip API accepts is passed through.',
    type: 'object',
    additionalProperties: true,
    example: { text: '{{payload.title}}' },
  })
  @IsObject()
  @IsOptional()
  zulip?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      'Grafana OnCall content overrides. Free-form: any key the Grafana OnCall API accepts is passed through.',
    type: 'object',
    additionalProperties: true,
    example: { message: '{{payload.title}}', state: 'alerting' },
  })
  @IsObject()
  @IsOptional()
  'grafana-on-call'?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'GetStream content overrides. Free-form: any key the GetStream API accepts is passed through.',
    type: 'object',
    additionalProperties: true,
    example: { text: '{{payload.title}}' },
  })
  @IsObject()
  @IsOptional()
  getstream?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Rocket.Chat content overrides. Free-form: any key the Rocket.Chat API accepts is passed through.',
    type: 'object',
    additionalProperties: true,
    example: { message: { msg: '{{payload.title}}' } },
  })
  @IsObject()
  @IsOptional()
  'rocket-chat'?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      'WhatsApp Business content overrides. Free-form: any key the WhatsApp Cloud API accepts is passed through.',
    type: 'object',
    additionalProperties: true,
    example: { type: 'text', text: { body: '{{payload.title}}' } },
  })
  @IsObject()
  @IsOptional()
  'whatsapp-business'?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'LINE content overrides. Free-form: any key the LINE Messaging API accepts is passed through.',
    type: 'object',
    additionalProperties: true,
    example: { messages: [{ type: 'text', text: '{{payload.title}}' }] },
  })
  @IsObject()
  @IsOptional()
  line?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Chat webhook content overrides. Free-form: the payload is sent as-is, so any key is accepted.',
    type: 'object',
    additionalProperties: true,
    example: { content: '{{payload.title}}' },
  })
  @IsObject()
  @IsOptional()
  'chat-webhook'?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      'Novu-managed Slack content overrides. Free-form: unlike the `slack` provider, the demo integration is not schema validated.',
    type: 'object',
    additionalProperties: true,
    example: { text: '{{payload.title}}' },
  })
  @IsObject()
  @IsOptional()
  'novu-slack'?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Telegram content overrides. Free-form: any key the Telegram Bot API accepts is passed through.',
    type: 'object',
    additionalProperties: true,
    example: { text: '{{payload.title}}', parse_mode: 'MarkdownV2' },
  })
  @IsObject()
  @IsOptional()
  telegram?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Sendblue content overrides. Free-form: any key the Sendblue API accepts is passed through.',
    type: 'object',
    additionalProperties: true,
    example: { content: '{{payload.title}}' },
  })
  @IsObject()
  @IsOptional()
  sendblue?: Record<string, unknown>;
}
