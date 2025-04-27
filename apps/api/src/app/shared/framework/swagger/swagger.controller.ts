/* eslint-disable max-len */
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import { SecuritySchemeObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { injectDocumentComponents } from './injection';
import {
  overloadDocumentForSdkGeneration,
  removeEndpointsWithoutApiKey,
  sortOpenAPIDocument,
} from './open.api.manipulation.component';
import metadata from '../../../../metadata';
import { API_KEY_SWAGGER_SECURITY_NAME, BEARER_SWAGGER_SECURITY_NAME } from '@novu/application-generic';

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
    .setVersion('1.0')
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
      `A subscriber in Novu represents someone who should receive a message. A subscriber’s profile information contains important attributes about the subscriber that will be used in messages (name, email). The subscriber object can contain other key-value pairs that can be used to further personalize your messages.`,
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
      { url: 'https://docs.novu.co/channels-and-providers/integration-store' }
    )
    // .addTag(
    //   'Workflows',
    //   `All notifications are sent via a workflow. Each workflow acts as a container for the logic and blueprint that are associated with a type of notification in your system.`,
    //   { url: 'https://docs.novu.co/workflows' }
    // )
    .addTag(
      'Messages',
      `A message in Novu represents a notification delivered to a recipient on a particular channel. Messages contain information about the request that triggered its delivery, a view of the data sent to the recipient, and a timeline of its lifecycle events. Learn more about messages.`,
      { url: 'https://docs.novu.co/workflows/messages' }
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
  const document = injectDocumentComponents(
    SwaggerModule.createDocument(app, baseDocument, {
      operationIdFactory: (controllerKey: string, methodKey: string) => `${controllerKey}_${methodKey}`,
      deepScanRoutes: true,
      ignoreGlobalPrefix: false,
      include: [],
      extraModels: [],
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

export const setupSwagger = async (app: INestApplication, internalSdkGeneration?: boolean) => {
  await SwaggerModule.loadPluginMetadata(metadata);
  const baseDocument = buildOpenApiBaseDocument(internalSdkGeneration);
  const document = buildFullDocumentWithPath(app, baseDocument);
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
