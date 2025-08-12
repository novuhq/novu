import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { SecuritySchemeObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { API_KEY_SWAGGER_SECURITY_NAME, BEARER_SWAGGER_SECURITY_NAME } from '@novu/application-generic';
import packageJson from '../../../../../package.json';
import metadata from '../../../../metadata';
import { webhookEvents } from '../../../outbound-webhooks/webhooks.const';
import { injectDocumentComponents } from './injection';
import {
  overloadDocumentForSdkGeneration,
  removeEndpointsWithoutApiKey,
  sortOpenAPIDocument,
} from './open.api.manipulation.component';

export const API_KEY_SECURITY_DEFINITIONS: SecuritySchemeObject = {
  type: 'apiKey',
  name: 'Authorization',
  in: 'header',
  description: 'API key authentication. Allowed headers-- "Authorization: ApiKey <api_key>".',
  'x-speakeasy-example': 'YOUR_SECRET_KEY_HERE',
} as unknown as SecuritySchemeObject;
export const BEARER_SECURITY_DEFINITIONS: SecuritySchemeObject = {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
};

function buildBaseOptions() {
  const options = new DocumentBuilder()
    .setTitle('Novu API')
    .setDescription('Novu REST API. Please see https://docs.novu.co/api-reference for more details.')
    .setVersion(packageJson.version)
    .setContact('Novu Support', 'https://discord.gg/novu', 'support@novu.co')
    .setExternalDoc('Novu Documentation', 'https://docs.novu.co')
    .setTermsOfService('https://novu.co/terms')
    .setLicense('MIT', 'https://opensource.org/license/mit')
    .addServer('https://api.novu.co')
    .addServer('https://eu.api.novu.co')
    .addSecurity(API_KEY_SWAGGER_SECURITY_NAME, API_KEY_SECURITY_DEFINITIONS)
    .addSecurityRequirements(API_KEY_SWAGGER_SECURITY_NAME)
    .addTag(
      'Events',
      `Events represent a change in state of a subscriber. They are used to trigger workflows, and enable you to send notifications to subscribers based on their actions.`,
      { url: 'https://docs.novu.co/workflows' }
    )
    .addTag(
      'Subscribers',
      `A subscriber in Novu represents someone who should receive a message. A subscriber's profile information contains important attributes about the subscriber that will be used in messages (name, email). The subscriber object can contain other key-value pairs that can be used to further personalize your messages.`,
      { url: 'https://docs.novu.co/subscribers/subscribers' }
    )
    .addTag(
      'Topics',
      `Topics are a way to group subscribers together so that they can be notified of events at once. A topic is identified by a custom key. This can be helpful for things like sending out marketing emails or notifying users of new features. Topics can also be used to send notifications to the subscribers who have been grouped together based on their interests, location, activities and much more.`,
      { url: 'https://docs.novu.co/subscribers/topics' }
    )
    .addTag(
      'Integrations',
      `With the help of the Integration Store, you can easily integrate your favorite delivery provider. During the runtime of the API, the Integrations Store is responsible for storing the configurations of all the providers.`,
      { url: 'https://docs.novu.co/platform/integrations/overview' }
    )
    .addTag(
      'Workflows',
      `All notifications are sent via a workflow. Each workflow acts as a container for the logic and blueprint that are associated with a type of notification in your system.`,
      { url: 'https://docs.novu.co/workflows' }
    )
    .addTag(
      'Messages',
      `A message in Novu represents a notification delivered to a recipient on a particular channel. Messages contain information about the request that triggered its delivery, a view of the data sent to the recipient, and a timeline of its lifecycle events. Learn more about messages.`,
      { url: 'https://docs.novu.co/workflows/messages' }
    )
    .addTag(
      'Environments',
      `Environments allow you to manage different stages of your application development lifecycle. Each environment has its own set of API keys and configurations, enabling you to separate development, staging, and production workflows.`,
      { url: 'https://docs.novu.co/platform/environments' }
    );
  return options;
}

function buildOpenApiBaseDocument(internalSdkGeneration: boolean | undefined) {
  const options = buildBaseOptions();
  if (internalSdkGeneration) {
    options.addSecurity(BEARER_SWAGGER_SECURITY_NAME, BEARER_SECURITY_DEFINITIONS);
    options.addSecurityRequirements(BEARER_SWAGGER_SECURITY_NAME);
  }

  return options.build();
}

function buildFullDocumentWithPath(app: INestApplication<any>, baseDocument: Omit<OpenAPIObject, 'paths'>) {
  // Define extraModels to ensure webhook payload DTOs are included in the schema definitions
  // Add other relevant payload DTOs here if more webhooks are defined
  const allWebhookPayloadDtos = [...new Set(webhookEvents.map((event) => event.payloadDto))];

  const document = injectDocumentComponents(
    SwaggerModule.createDocument(app, baseDocument, {
      operationIdFactory: (controllerKey: string, methodKey: string) => `${controllerKey}_${methodKey}`,
      deepScanRoutes: true,
      ignoreGlobalPrefix: false,
      include: [],
      extraModels: [...allWebhookPayloadDtos], // Make sure payload DTOs are processed
    })
  );
  return document;
}

function publishDeprecatedDocument(app: INestApplication<any>, document: OpenAPIObject) {
  SwaggerModule.setup('api', app, {
    ...document,
    info: {
      ...document.info,
      title: `DEPRECATED: ${document.info.title}. Use /openapi.{json,yaml} instead.`,
    },
  });
}

function publishLegacyOpenApiDoc(app: INestApplication<any>, document: OpenAPIObject) {
  SwaggerModule.setup('openapi', app, removeEndpointsWithoutApiKey(document), {
    jsonDocumentUrl: 'openapi.json',
    yamlDocumentUrl: 'openapi.yaml',
    explorer: process.env.NODE_ENV !== 'production',
  });
}

/**
 * Generates the `x-webhooks` section for the OpenAPI document based on defined events and DTOs.
 * Follows the OpenAPI specification for webhooks: https://spec.openapis.org/oas/v3.1.0#fixed-fields-1:~:text=Webhooks%20Object
 */
function generateWebhookDefinitions(document: OpenAPIObject) {
  const webhooksDefinition: Record<string, any> = {}; // Structure matches Path Item Object

  webhookEvents.forEach((webhook) => {
    // Assume the schema name matches the DTO class name (generated by Swagger)
    const payloadSchemaRef = `#/components/schemas/${(webhook.payloadDto as Function).name}`;
    const wrapperSchemaName = `${(webhook.payloadDto as Function).name}WebhookPayloadWrapper`; // Unique name for the wrapper schema

    // Define the wrapper schema in components/schemas if it doesn't exist
    if (document.components && !document.components.schemas?.[wrapperSchemaName]) {
      if (!document.components.schemas) {
        document.components.schemas = {};
      }
      document.components.schemas[wrapperSchemaName] = {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique identifier of the webhook event (evt_✱).',
          },
          type: { type: 'string', enum: [webhook.event], description: 'The type of the webhook event.' },
          data: {
            description: 'The actual event data payload.',
            allOf: [{ $ref: payloadSchemaRef }], // Use allOf to correctly reference the payload schema
          },
          timestamp: { type: 'string', format: 'date-time', description: 'ISO timestamp of when the event occurred.' },
          environmentId: { type: 'string', description: 'The ID of the environment associated with the event.' },
          object: {
            type: 'string',
            enum: [webhook.objectType],
            description: 'The type of object the event relates to.',
          },
        },
        required: ['type', 'data', 'timestamp', 'environmentId', 'object'],
      };
    }

    webhooksDefinition[webhook.event] = {
      // This structure represents a Path Item Object, describing the webhook POST request.
      post: {
        summary: `Event: ${webhook.event}`,
        description: `This webhook is triggered when a \`${webhook.objectType}\` event (\`${
          webhook.event
        }\`) occurs. The payload contains the details of the event. Configure your webhook endpoint URL in the Novu dashboard.`,
        requestBody: {
          description: `Webhook payload for the \`${webhook.event}\` event.`,
          required: true,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${wrapperSchemaName}` }, // Reference the wrapper schema
            },
          },
        },
        responses: {
          '200': {
            description: 'Acknowledges successful receipt of the webhook. No response body is expected.',
          },
          // Consider adding other responses (e.g., 4xx for signature validation failure, 5xx for processing errors)
        },
        tags: ['Webhooks'], // Assign to a 'Webhooks' tag
      },
    };
  });

  document['x-webhooks'] = webhooksDefinition;
}

export const setupSwagger = async (app: INestApplication, internalSdkGeneration?: boolean) => {
  await SwaggerModule.loadPluginMetadata(metadata);
  const baseDocument = buildOpenApiBaseDocument(internalSdkGeneration);
  const document = buildFullDocumentWithPath(app, baseDocument);

  // Generate and add x-webhooks section FIRST
  generateWebhookDefinitions(document);

  publishDeprecatedDocument(app, document);
  publishLegacyOpenApiDoc(app, document);

  return publishSdkSpecificDocumentAndReturnDocument(app, document, internalSdkGeneration);
};

function overloadNamingGuidelines(document: OpenAPIObject) {
  document['x-speakeasy-name-override'] = [
    { operationId: '^.*get.*', methodNameOverride: 'retrieve' },
    { operationId: '^.*retrieve.*', methodNameOverride: 'retrieve' },
    { operationId: '^.*create.*', methodNameOverride: 'create' },
    { operationId: '^.*update.*', methodNameOverride: 'update' },
    { operationId: '^.*list.*', methodNameOverride: 'list' },
    { operationId: '^.*delete.*', methodNameOverride: 'delete' },
    { operationId: '^.*remove.*', methodNameOverride: 'delete' },
  ];
}

function overloadGlobalSdkRetrySettings(document: OpenAPIObject) {
  document['x-speakeasy-retries'] = {
    strategy: 'backoff',
    backoff: {
      initialInterval: 1000,
      maxInterval: 30000,
      maxElapsedTime: 3600000,
      exponent: 1.5,
    },
    statusCodes: [408, 409, 429, '5XX'],
    retryConnectionErrors: true,
  };
}

function publishSdkSpecificDocumentAndReturnDocument(
  app: INestApplication,
  document: OpenAPIObject,
  internalSdkGeneration?: boolean
) {
  overloadNamingGuidelines(document);
  overloadGlobalSdkRetrySettings(document);
  let sdkDocument: OpenAPIObject = overloadDocumentForSdkGeneration(document, internalSdkGeneration);
  sdkDocument = sortOpenAPIDocument(sdkDocument);
  SwaggerModule.setup('openapi.sdk', app, sdkDocument, {
    jsonDocumentUrl: 'openapi.sdk.json',
    yamlDocumentUrl: 'openapi.sdk.yaml',
    explorer: process.env.NODE_ENV !== 'production',
  });
  return sdkDocument;
}
