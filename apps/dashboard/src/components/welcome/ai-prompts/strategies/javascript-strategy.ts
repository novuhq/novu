import type { NovuConfig, SetupStep } from '../types';
import { BaseFrameworkStrategy, Environment } from './framework-strategy';

export class JavaScriptStrategy extends BaseFrameworkStrategy {
  constructor() {
    super({
      envVarName: 'NOVU_APP_IDENTIFIER',
      envFileName: '.env',
      packageName: '@novu/js',
      docsUrl: 'https://docs.novu.co/platform/inbox/javascript',
    });
  }

  validateEnvironment(env: Environment, requireCredentials: boolean = false) {
    return this.validateRequiredVars(env, requireCredentials);
  }

  generateSetupSteps(env: Environment): SetupStep[] {
    const { applicationIdentifier, subscriberId, backendUrl, socketUrl } = env;
    const validation = this.validateEnvironment(env, true); // Require credentials for code generation

    if (!validation.isValid) {
      throw new Error(
        `Missing required environment variables: ${validation.missingVars.join(', ')}. Please provide all required values.`
      );
    }

    const steps: SetupStep[] = [];

    // Add environment variable setup step
    steps.push({
      title: `Set environment variables in ${this.config.envFileName}`,
      code: this.getEnvSetupCode(env),
      notes: [
        `${this.config.envVarName}: Found in the Novu dashboard under **API Keys**.`,
        'Subscriber ID: Generated from your authentication system or provided for testing.',
        ...(backendUrl ? ['Backend URL: Custom Novu backend endpoint.'] : []),
        ...(socketUrl ? ['Socket URL: Custom Novu WebSocket endpoint.'] : []),
        'Make sure to restart your development server after adding environment variables.',
      ],
    });

    // Add component implementation step
    steps.push({
      title: 'Add the notification center to your app',
      description:
        'You can use the Novu UI library to implement the notification center in your JavaScript application:',
      code: `import { NovuUI } from '@novu/js/ui';

// Function to generate temporary subscriber ID for testing using cryptographically secure random UUID
function getTemporarySubscriberId() {
  return 'user-' + crypto.randomUUID();
}

// Initialize Novu with your configuration
const novu = new NovuUI({
  options: {
    applicationIdentifier: '${this.escapeForDoubleQuotes(applicationIdentifier)}',
    subscriber: '${this.escapeForDoubleQuotes(subscriberId)}'${this.getConfigTemplate({
      backendUrl,
      socketUrl,
      applicationIdentifier: applicationIdentifier || '',
      subscriberId: subscriberId || '',
    })},
  },
});

// Mount the notification center component
novu.mountComponent({
  name: 'Inbox',
  props: {},
  element: document.getElementById('notification-inbox'),
});

// Subscribe to real-time events
novu.on('notification.unread', (data) => {
  console.log('New unread notification:', data);
});

// Fetch notifications manually if needed
novu.notifications.list({
  page: 0,
  limit: 10,
}).then((notifications) => {
  console.log('Notifications:', notifications);
});

// Mark notifications as read
novu.notifications.markAsRead('notification-id');

// Archive notifications
novu.notifications.archive('notification-id');`,
      notes: [
        'This is a headless solution for full UI control.',
        'For production: Replace with dynamic ID from your authentication solution.',
        'Common patterns: getCurrentUserId(), user?.id, etc.',
        "Note: subscriberId comes from your app's authentication, not from the Novu dashboard.",
        'Region configuration is automatically included for EU users only.',
        'Make sure to add <div id="notification-inbox"></div> in your HTML.',
        'Use novu.notifications.list() for fetching notifications.',
        'Set up real-time event listeners with novu.on().',
        'Implement custom UI rendering logic for notifications.',
      ],
    });

    return steps;
  }

  getConfigTemplate(config: NovuConfig): string {
    const configEntries = Object.entries(config)
      .filter((entry): entry is [string, string] => entry[1] !== undefined)
      .map(([key, value]) => `,\n    ${key}: '${this.escapeForDoubleQuotes(value)}'`);

    return configEntries.join('');
  }

  getEnvSetupCode(env: Environment): string {
    const { applicationIdentifier, subscriberId, backendUrl, socketUrl } = env;
    const validation = this.validateEnvironment(env, true);

    if (!validation.isValid) {
      throw new Error(
        `Missing required environment variables: ${validation.missingVars.join(', ')}. Please provide all required values.`
      );
    }

    const envVars = [
      `${this.config.envVarName}=${this.escapeForDoubleQuotes(applicationIdentifier)}`,
      `NOVU_SUBSCRIBER_ID=${this.escapeForDoubleQuotes(subscriberId)}`,
      ...(backendUrl ? [`NOVU_BACKEND_URL=${this.escapeForDoubleQuotes(backendUrl)}`] : []),
      ...(socketUrl ? [`NOVU_SOCKET_URL=${this.escapeForDoubleQuotes(socketUrl)}`] : []),
    ];

    return envVars.join('\n');
  }

  getEnvValidationCode(envAccess: string): string {
    // Extract the environment variable name from the access string
    const envVarName = envAccess.replace(/^process\.env\./, '');
    return `if (!${envAccess}) {
  console.error('${envVarName} is not set');
  return null;
}`;
  }
}
