import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import { injectDocumentComponents } from './injection';

const options = new DocumentBuilder()
  .setTitle('Novu API')
  .setDescription('Novu REST API. Please see https://docs.novu.co/api-reference for more details.')
  .setVersion('1.0')
  .setContact('Novu Support', 'https://discord.gg/novu', 'support@novu.co')
  .setExternalDoc('Novu Documentation', 'https://docs.novu.co')
  .setTermsOfService('https://novu.co/terms')
  .setLicense('MIT', 'https://opensource.org/license/mit')
  .addServer(process.env.API_ROOT_URL)
  .addApiKey({
    type: 'apiKey',
    name: 'Authorization',
    in: 'header',
    description: 'API key authentication. Allowed headers-- "Authorization: ApiKey <api_key>".',
  })
  .addTag('Events')
  .addTag('Subscribers')
  .addTag('Topics')
  .addTag('Notification')
  .addTag('Integrations')
  .addTag('Layouts')
  .addTag('Workflows')
  .addTag('Notification Templates')
  .addTag('Workflow groups')
  .addTag('Changes')
  .addTag('Environments')
  .addTag('Inbound Parse')
  .addTag('Feeds')
  .addTag('Tenants')
  .addTag('Messages')
  .addTag('Organizations')
  .addTag('Execution Details')
  .build();

export const setupSwagger = (app: INestApplication) => {
  const document = injectDocumentComponents(SwaggerModule.createDocument(app, options));

  SwaggerModule.setup('api', app, {
    ...document,
    info: {
      ...document.info,
      title: `DEPRECATED: ${document.info.title}. Use /openapi.{json,yaml} instead.`,
    },
  });
  SwaggerModule.setup('openapi', app, document, {
    jsonDocumentUrl: 'openapi.json',
    yamlDocumentUrl: 'openapi.yaml',
    explorer: process.env.NODE_ENV !== 'production',
  });
};
