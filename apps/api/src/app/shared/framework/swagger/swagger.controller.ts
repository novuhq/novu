/* eslint-disable max-len */
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
    'Notification',
    'A notification conveys information from source to recipient, triggered by a workflow acting as a message blueprint. Notifications can be individual or bundled as digest for user-friendliness.',
    { url: 'https://docs.novu.co/getting-started/introduction' }
  )
  .addTag(
    'Integrations',
    `With the help of the Integration Store, you can easily integrate your favorite delivery provider. During the runtime of the API, the Integrations Store is responsible for storing the configurations of all the providers.`,
    { url: 'https://docs.novu.co/channels-and-providers/integration-store' }
  )
  .addTag(
    'Layouts',
    `Novu allows the creation of layouts - a specific HTML design or structure to wrap content of email notifications. Layouts can be manipulated and assigned to new or existing workflows within the Novu platform, allowing users to create, manage, and assign these layouts to workflows, so they can be reused to structure the appearance of notifications sent through the platform.`,
    { url: 'https://docs.novu.co/content-creation-design/layouts' }
  )
  .addTag(
    'Workflows',
    `All notifications are sent via a workflow. Each workflow acts as a container for the logic and blueprint that are associated with a type of notification in your system.`,
    { url: 'https://docs.novu.co/workflows' }
  )
  .addTag(
    'Notification Templates',
    `Deprecated. Use Workflows (/workflows) instead, which provide the same functionality under a new name.`
  )
  .addTag('Workflow groups', `Workflow groups are used to organize workflows into logical groups.`)
  .addTag(
    'Changes',
    `Changes represent a change in state of an environment. They are analagous to a pending pull request in git, enabling you to test changes before they are applied to your environment and atomically apply them when you are ready.`,
    { url: 'https://docs.novu.co/platform/environments#promoting-pending-changes-to-production' }
  )
  .addTag(
    'Environments',
    `Novu uses the concept of environments to ensure logical separation of your data and configuration. This means that subscribers, and preferences created in one environment are never accessible to another.`,
    { url: 'https://docs.novu.co/platform/environments' }
  )
  .addTag(
    'Inbound Parse',
    `Inbound Webhook is a feature that allows processing of incoming emails for a domain or subdomain. The feature parses the contents of the email and POSTs the information to a specified URL in a multipart/form-data format.`,
    { url: 'https://docs.novu.co/platform/inbound-parse-webhook' }
  )
  .addTag(
    'Feeds',
    `Novu provides a notification activity feed that monitors every outgoing message associated with its relevant metadata. This can be used to monitor activity and discover potential issues with a specific provider or a channel type.`,
    { url: 'https://docs.novu.co/activity-feed' }
  )
  .addTag(
    'Tenants',
    `A tenant represents a group of users. As a developer, when your apps have organizations, they are referred to as tenants. Tenants in Novu provides the ability to tailor specific notification experiences to users of different groups or organizations.`,
    { url: 'https://docs.novu.co/tenants' }
  )
  .addTag(
    'Messages',
    `A message in Novu represents a notification delivered to a recipient on a particular channel. Messages contain information about the request that triggered its delivery, a view of the data sent to the recipient, and a timeline of its lifecycle events. Learn more about messages.`,
    { url: 'https://docs.novu.co/workflows/messages' }
  )
  .addTag(
    'Organizations',
    `An organization serves as a separate entity within your Novu account. Each organization you create has its own separate integration store, workflows, subscribers, and API keys. This separation of resources allows you to manage multi-tenant environments and separate domains within a single account.`,
    { url: 'https://docs.novu.co/platform/organizations' }
  )
  .addTag(
    'Execution Details',
    `Execution details are used to track the execution of a workflow. They provided detailed information on the execution of a workflow, including the status of each step, the input and output of each step, and the overall status of the execution.`,
    { url: 'https://docs.novu.co/activity-feed' }
  )
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
