import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import {
  InboundEmailWebhookPayloadDto,
  MessageWebhookPayloadDto,
  MessageWebhookPayloadWithErrorDto,
  PreferenceWebhookPayloadDto,
  WorkflowCreatedWebhookPayloadDto,
  WorkflowDeletedWebhookPayloadDto,
  WorkflowPublishedWebhookPayloadDto,
  WorkflowUpdatedWebhookPayloadDto,
} from '@novu/application-generic';
import { WebhookEventEnum } from '@novu/shared';
import { expect } from 'chai';
import { generateWebhookDefinitions } from './webhook-openapi';
import { webhookEvents } from './webhooks.const';

interface Schema {
  $ref?: string;
  properties?: Record<string, Schema>;
  required?: string[];
  enum?: string[];
  items?: Schema;
  allOf?: Schema[];
  oneOf?: Schema[];
  additionalProperties?: Schema | boolean;
}

interface WebhookOperation {
  post: {
    operationId: string;
    requestBody: {
      content: {
        'application/json': {
          schema: Schema;
        };
      };
    };
  };
}

const BASIC_MESSAGE_EVENTS = [
  WebhookEventEnum.MESSAGE_DELIVERED,
  WebhookEventEnum.MESSAGE_SEEN,
  WebhookEventEnum.MESSAGE_READ,
  WebhookEventEnum.MESSAGE_UNREAD,
  WebhookEventEnum.MESSAGE_ARCHIVED,
  WebhookEventEnum.MESSAGE_UNARCHIVED,
  WebhookEventEnum.MESSAGE_SNOOZED,
  WebhookEventEnum.MESSAGE_UNSNOOZED,
  WebhookEventEnum.MESSAGE_DELETED,
];

@Module({})
class WebhookSchemaModule {}

function collectSchemaRefs(value: unknown, refs: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectSchemaRefs(item, refs);
    }

    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  for (const [key, item] of Object.entries(value)) {
    if (key === '$ref' && typeof item === 'string') {
      refs.add(item);
      continue;
    }

    collectSchemaRefs(item, refs);
  }
}

describe('outbound webhook OpenAPI schemas', () => {
  let document: OpenAPIObject;
  let schemas: Record<string, Schema>;
  let webhookDefinitions: Record<string, WebhookOperation>;

  before(async () => {
    const app = await NestFactory.create(WebhookSchemaModule, { logger: false });

    try {
      document = SwaggerModule.createDocument(
        app,
        new DocumentBuilder().setTitle('outbound webhooks').setVersion('1').build(),
        { extraModels: [...new Set(webhookEvents.map((event) => event.payloadDto))] }
      );
      generateWebhookDefinitions(document, webhookEvents);
      schemas = (document.components?.schemas ?? {}) as Record<string, Schema>;
      webhookDefinitions = document['x-webhooks'] as Record<string, WebhookOperation>;
    } finally {
      await app.close();
    }
  });

  it('maps every event to its canonical payload schema', () => {
    for (const event of BASIC_MESSAGE_EVENTS) {
      expect(webhookEvents.find((item) => item.event === event)?.payloadDto).to.equal(MessageWebhookPayloadDto);
    }

    for (const event of [WebhookEventEnum.MESSAGE_SENT, WebhookEventEnum.MESSAGE_FAILED]) {
      expect(webhookEvents.find((item) => item.event === event)?.payloadDto).to.equal(
        MessageWebhookPayloadWithErrorDto
      );
    }

    expect(webhookEvents.find((item) => item.event === WebhookEventEnum.WORKFLOW_CREATED)?.payloadDto).to.equal(
      WorkflowCreatedWebhookPayloadDto
    );
    expect(webhookEvents.find((item) => item.event === WebhookEventEnum.WORKFLOW_UPDATED)?.payloadDto).to.equal(
      WorkflowUpdatedWebhookPayloadDto
    );
    expect(webhookEvents.find((item) => item.event === WebhookEventEnum.WORKFLOW_DELETED)?.payloadDto).to.equal(
      WorkflowDeletedWebhookPayloadDto
    );
    expect(webhookEvents.find((item) => item.event === WebhookEventEnum.WORKFLOW_PUBLISHED)?.payloadDto).to.equal(
      WorkflowPublishedWebhookPayloadDto
    );
    expect(webhookEvents.find((item) => item.event === WebhookEventEnum.PREFERENCE_UPDATED)?.payloadDto).to.equal(
      PreferenceWebhookPayloadDto
    );
    expect(webhookEvents.find((item) => item.event === WebhookEventEnum.EMAIL_RECEIVED)?.payloadDto).to.equal(
      InboundEmailWebhookPayloadDto
    );
  });

  it('documents the canonical mapped message shape and optional provider errors', () => {
    expect(schemas.MessageWebhookPayloadDto.properties?.object?.$ref).to.equal(
      '#/components/schemas/MessageWebhookResponseDto'
    );
    expect(schemas.MessageWebhookPayloadWithErrorDto.properties?.object?.$ref).to.equal(
      '#/components/schemas/MessageWebhookResponseDto'
    );
    expect(schemas.MessageWebhookPayloadWithErrorDto.properties?.error?.$ref).to.equal(
      '#/components/schemas/MessageWebhookErrorDto'
    );
    expect(schemas.MessageWebhookResponseDto.properties).to.include.keys(
      '_id',
      '_templateId',
      'subscriberId',
      'templateIdentifier',
      'workflowId',
      'stepId',
      'transactionId',
      'channel',
      'channelData'
    );
  });

  it('documents preference and inbound email nested payloads', () => {
    expect(schemas.PreferenceWebhookPayloadDto.properties?.object?.$ref).to.equal(
      '#/components/schemas/PreferenceWebhookObjectDto'
    );
    expect(schemas.PreferenceWebhookObjectDto.properties?.channels?.$ref).to.equal(
      '#/components/schemas/PreferenceChannelsDto'
    );

    expect(schemas.InboundEmailWebhookPayloadDto.properties?.object?.$ref).to.equal(
      '#/components/schemas/InboundEmailWebhookObjectDto'
    );
    expect(schemas.InboundEmailWebhookMailDto.properties?.cc?.items?.$ref).to.equal(
      '#/components/schemas/InboundEmailWebhookAddressDto'
    );
    expect(schemas.InboundEmailWebhookMailDto.required).to.include('attachments');
  });

  it('models workflow update previousObject as its two real persisted variants', () => {
    const previousObject = schemas.WorkflowUpdatedWebhookPayloadDto.properties?.previousObject;

    expect(previousObject?.oneOf?.map((schema) => schema.$ref)).to.have.members([
      '#/components/schemas/PersistedWorkflowWebhookDto',
      '#/components/schemas/PersistedWorkflowWithPreferencesWebhookDto',
    ]);
    expect(schemas.WorkflowDeletedWebhookPayloadDto.properties?.object?.$ref).to.equal(
      '#/components/schemas/PersistedWorkflowWebhookDto'
    );
    expect(schemas.PersistedWorkflowWithPreferencesWebhookDto.required).to.include.members([
      'userPreferences',
      'defaultPreferences',
    ]);
    expect(schemas.PersistedWorkflowWebhookDto.properties?.preferenceSettings?.$ref).to.equal(
      '#/components/schemas/PreferenceChannelsDto'
    );
  });

  it('keeps the shared workflow response schema aligned with runtime', () => {
    expect(schemas.ControlsMetadataDto.properties).to.include.keys('dataSchema', 'uiSchema', 'values');
    const workflowIssues = schemas.WorkflowResponseDto.properties?.issues?.additionalProperties as Schema;

    expect(workflowIssues.items?.$ref).to.equal('#/components/schemas/RuntimeIssueDto');
    expect(schemas.RuntimeIssueDto.properties).to.include.keys('issueType', 'variableName', 'message');
  });

  it('generates one correctly typed wrapper per event with a direct data reference', () => {
    expect(Object.keys(webhookDefinitions)).to.have.length(webhookEvents.length);

    const wrapperRefs = webhookEvents.map(
      ({ event }) => webhookDefinitions[event].post.requestBody.content['application/json'].schema.$ref
    );
    expect(new Set(wrapperRefs).size).to.equal(webhookEvents.length);

    for (const webhook of webhookEvents) {
      const operation = webhookDefinitions[webhook.event].post;
      const wrapperName = `${webhook.event.replace(/\./g, '_')}WebhookPayloadWrapper`;
      const wrapper = schemas[wrapperName];

      expect(operation.operationId).to.equal(webhook.event);
      expect(wrapper.properties?.type?.enum).to.deep.equal([webhook.event]);
      expect(wrapper.properties?.object?.enum).to.deep.equal([webhook.objectType]);
      expect(wrapper.properties?.data?.$ref).to.equal(`#/components/schemas/${webhook.payloadDto.name}`);
      expect(wrapper.required).to.have.members(['id', 'type', 'data', 'timestamp', 'environmentId', 'object']);
    }
  });

  it('resolves every schema reference reachable from the webhook document', () => {
    const refs = new Set<string>();
    collectSchemaRefs(schemas, refs);
    collectSchemaRefs(webhookDefinitions, refs);

    for (const ref of refs) {
      const schemaName = ref.match(/^#\/components\/schemas\/(.+)$/)?.[1];

      expect(schemaName, `unsupported schema reference: ${ref}`).to.not.equal(undefined);
      expect(schemas, `missing schema referenced by ${ref}`).to.have.property(schemaName as string);
    }
  });
});
