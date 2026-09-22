import type { OpenAPIObject } from '@nestjs/swagger';
import type { WebhookEventConfig } from './webhooks.const';

export function generateWebhookDefinitions(
  document: OpenAPIObject,
  webhookEvents: readonly WebhookEventConfig[]
): void {
  const webhookDefinitions: OpenAPIObject['paths'] = {};
  document.components ??= {};
  document.components.schemas ??= {};

  for (const webhook of webhookEvents) {
    const payloadSchemaRef = `#/components/schemas/${webhook.payloadDto.name}`;
    const wrapperSchemaName = `${webhook.event.replace(/\./g, '_')}WebhookPayloadWrapper`;

    document.components.schemas[wrapperSchemaName] = {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Unique identifier of the webhook event (evt_✱).',
        },
        type: {
          type: 'string',
          enum: [webhook.event],
          description: 'The type of the webhook event.',
        },
        data: { $ref: payloadSchemaRef },
        timestamp: {
          type: 'string',
          format: 'date-time',
          description: 'ISO timestamp of when the event occurred.',
        },
        environmentId: {
          type: 'string',
          description: 'The identifier of the environment associated with the event.',
        },
        object: {
          type: 'string',
          enum: [webhook.objectType],
          description: 'The type of object the event relates to.',
        },
      },
      required: ['id', 'type', 'data', 'timestamp', 'environmentId', 'object'],
    };

    webhookDefinitions[webhook.event] = {
      post: {
        operationId: webhook.event,
        summary: `Event: ${webhook.event}`,
        description: `This webhook is triggered when a \`${webhook.objectType}\` event (\`${webhook.event}\`) occurs. The payload contains the details of the event. Configure your webhook endpoint URL in the Novu dashboard.`,
        requestBody: {
          description: `Webhook payload for the \`${webhook.event}\` event.`,
          required: true,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${wrapperSchemaName}` },
            },
          },
        },
        responses: {
          '200': {
            description: 'Acknowledges successful receipt of the webhook. No response body is expected.',
          },
        },
        tags: ['Webhooks'],
      },
    };
  }

  document['x-webhooks'] = webhookDefinitions;
}
