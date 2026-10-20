export type DocsPage = {
  title: string;
  path: string;
  keywords: string[];
};

/**
 * Curated subset of docs.novu.co searched client-side by the help panel.
 * Paths must match pages under `docs/` in this repository.
 */
export const DOCS_PAGES: DocsPage[] = [
  {
    title: 'What is Novu?',
    path: '/platform/what-is-novu',
    keywords: ['overview', 'introduction', 'basics', 'platform'],
  },
  {
    title: 'How Novu works',
    path: '/platform/how-novu-works',
    keywords: ['architecture', 'flow', 'basics', 'overview'],
  },
  {
    title: 'Notification workflows',
    path: '/platform/workflow',
    keywords: ['workflow', 'steps', 'editor', 'channels'],
  },
  {
    title: 'Create a workflow',
    path: '/platform/workflow/create-a-workflow',
    keywords: ['new workflow', 'template', 'getting started'],
  },
  {
    title: 'Configure a workflow',
    path: '/platform/workflow/configure-workflow',
    keywords: ['settings', 'identifier', 'tags', 'critical', 'preferences'],
  },
  {
    title: 'Trigger a workflow',
    path: '/platform/workflow/trigger-workflow',
    keywords: ['trigger', 'event', 'api', 'payload', 'send', 'test'],
  },
  {
    title: 'Monitor and debug a workflow',
    path: '/platform/workflow/monitor-and-debug-workflow',
    keywords: ['activity', 'logs', 'debug', 'errors', 'execution'],
  },
  {
    title: 'Add and configure steps',
    path: '/platform/workflow/add-and-configure-steps',
    keywords: ['steps', 'email', 'sms', 'push', 'chat', 'in-app'],
  },
  {
    title: 'Delay step',
    path: '/platform/workflow/add-and-configure-steps/configure-action-steps/delay',
    keywords: ['wait', 'schedule', 'timed', 'payload', 'later'],
  },
  {
    title: 'Schedule a delay from payload values',
    path: '/platform/workflow/add-and-configure-steps/configure-action-steps/delay#dynamic-delay',
    keywords: ['dynamic', 'wait', 'timestamp', 'payload'],
  },
  {
    title: 'Digest step',
    path: '/platform/workflow/add-and-configure-steps/configure-action-steps/digest',
    keywords: ['batch', 'aggregate', 'summary', 'group'],
  },
  {
    title: 'Throttle step',
    path: '/platform/workflow/add-and-configure-steps/configure-action-steps/throttle',
    keywords: ['rate limit', 'limit', 'frequency'],
  },
  {
    title: 'HTTP step',
    path: '/platform/workflow/add-and-configure-steps/configure-action-steps/http-step',
    keywords: ['webhook', 'request', 'api', 'fetch'],
  },
  {
    title: 'Step conditions',
    path: '/platform/workflow/add-and-configure-steps/step-conditions',
    keywords: ['skip', 'condition', 'filter', 'rules', 'seen', 'read'],
  },
  {
    title: 'Code steps',
    path: '/platform/workflow/add-and-configure-steps/code-steps',
    keywords: ['framework', 'bridge', 'custom'],
  },
  {
    title: 'Channel template editors',
    path: '/platform/workflow/add-notification-content/channels-template-editors',
    keywords: ['email editor', 'template', 'layouts', 'content', 'html'],
  },
  {
    title: 'Personalize content with variables',
    path: '/platform/workflow/add-notification-content/personalize-content',
    keywords: ['variables', 'liquid', 'payload', 'subscriber', 'firstname'],
  },
  {
    title: 'Translations',
    path: '/platform/workflow/advanced-features/translations',
    keywords: ['localization', 'i18n', 'language', 'locale'],
  },
  {
    title: 'Contexts in workflows',
    path: '/platform/workflow/advanced-features/contexts',
    keywords: ['context', 'metadata', 'tenant'],
  },
  {
    title: 'Subscribers',
    path: '/platform/concepts/subscribers',
    keywords: ['users', 'recipients', 'subscriber id', 'profile'],
  },
  {
    title: 'Topics',
    path: '/platform/concepts/topics',
    keywords: ['groups', 'broadcast', 'bulk', 'audience'],
  },
  {
    title: 'Preferences',
    path: '/platform/concepts/preferences',
    keywords: ['opt out', 'unsubscribe', 'channels', 'settings'],
  },
  {
    title: 'Contexts',
    path: '/platform/concepts/contexts',
    keywords: ['context', 'metadata', 'tenant'],
  },
  {
    title: 'Multi-tenancy',
    path: '/platform/concepts/tenants',
    keywords: ['tenants', 'organizations', 'workspaces'],
  },
  {
    title: 'Trigger',
    path: '/platform/concepts/trigger',
    keywords: ['event', 'api', 'send'],
  },
  {
    title: 'Integrations',
    path: '/platform/integrations',
    keywords: ['providers', 'connect', 'channels'],
  },
  {
    title: 'Email providers',
    path: '/platform/integrations/email',
    keywords: ['sendgrid', 'resend', 'ses', 'mailgun', 'smtp', 'connect'],
  },
  {
    title: 'SMS providers',
    path: '/platform/integrations/sms',
    keywords: ['twilio', 'text message', 'phone'],
  },
  {
    title: 'Push providers',
    path: '/platform/integrations/push',
    keywords: ['fcm', 'apns', 'expo', 'mobile', 'notifications'],
  },
  {
    title: 'Chat providers',
    path: '/platform/integrations/chat',
    keywords: ['slack', 'discord', 'teams', 'whatsapp', 'telegram'],
  },
  {
    title: 'Demo integrations',
    path: '/platform/integrations/demo-integration',
    keywords: ['test', 'sandbox', 'novu provider'],
  },
  {
    title: 'Integration conditions',
    path: '/platform/integrations/integration-conditions',
    keywords: ['routing', 'tenant', 'conditions'],
  },
  {
    title: 'Inbox',
    path: '/platform/inbox',
    keywords: ['in-app', 'notification center', 'react', 'component'],
  },
  {
    title: 'Set up the Inbox',
    path: '/platform/inbox/setup-inbox',
    keywords: ['in-app', 'install', 'react', 'getting started'],
  },
  {
    title: 'Inbox styling and theming',
    path: '/platform/inbox/configuration/styling',
    keywords: ['appearance', 'css', 'theme', 'customize'],
  },
  {
    title: 'Inbox tabs',
    path: '/platform/inbox/configuration/tabs',
    keywords: ['filter', 'tags', 'categories'],
  },
  {
    title: 'Headless Inbox',
    path: '/platform/inbox/headless-mode',
    keywords: ['custom ui', 'hooks', 'api'],
  },
  {
    title: 'Prepare the Inbox for production',
    path: '/platform/inbox/prepare-for-production',
    keywords: ['hmac', 'security', 'launch'],
  },
  {
    title: 'Environments',
    path: '/platform/developer/environments',
    keywords: ['development', 'production', 'publish', 'sync'],
  },
  {
    title: 'API keys',
    path: '/platform/developer/api-keys',
    keywords: ['secret key', 'application identifier', 'authentication'],
  },
  {
    title: 'Webhooks',
    path: '/platform/developer/webhooks/webhooks',
    keywords: ['events', 'callbacks', 'outbound'],
  },
  {
    title: 'Webhook event types',
    path: '/platform/developer/webhooks/event-types',
    keywords: ['events', 'payload', 'webhooks'],
  },
  {
    title: 'Delivery retries',
    path: '/platform/developer/delivery-retries',
    keywords: ['retry', 'failure', 'backoff'],
  },
  {
    title: 'Limits',
    path: '/platform/developer/limits',
    keywords: ['rate limit', 'quota', 'payload size'],
  },
  {
    title: 'Common errors',
    path: '/platform/additional-resources/errors',
    keywords: ['error', 'troubleshooting', 'debug', 'bridge'],
  },
  {
    title: 'Team members',
    path: '/platform/account/manage-members',
    keywords: ['invite', 'users', 'team'],
  },
  {
    title: 'Roles and permissions',
    path: '/platform/account/roles-and-permissions',
    keywords: ['rbac', 'access', 'admin'],
  },
  {
    title: 'Novu MCP server',
    path: '/platform/build-with-ai/mcp',
    keywords: ['ai', 'cursor', 'claude', 'agents'],
  },
  {
    title: 'What is ACI?',
    path: '/agents/get-started/what-is-aci',
    keywords: ['agents', 'ai', 'connect'],
  },
  {
    title: 'Agents mental model',
    path: '/agents/get-started/mental-model',
    keywords: ['agents', 'messages', 'flow'],
  },
  {
    title: 'Agents and providers',
    path: '/agents/get-started/agents-and-providers',
    keywords: ['agents', 'slack', 'teams', 'whatsapp'],
  },
  {
    title: 'Agent conversations',
    path: '/agents/conversations',
    keywords: ['agents', 'threads', 'history'],
  },
];
