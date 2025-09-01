import type { NovuConfig } from '../config/environment-config';
import type { SetupStep } from '../types/framework';
import { BaseFrameworkStrategy, Environment } from './framework-strategy';

export class VueStrategy extends BaseFrameworkStrategy {
  constructor() {
    super({
      envVarName: 'VITE_NOVU_APP_IDENTIFIER',
      envFileName: '.env.local',
      packageName: '@novu/js',
      docsUrl: 'https://docs.novu.co/platform/inbox/vue',
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
        'The VITE_ prefix is required for Vite to expose env variables to the client.',
      ],
    });

    // Add component implementation step
    steps.push({
      title: 'Add the notification Inbox to your app',
      description: 'You can use the Novu UI library to implement the notification center in your Vue application.',
      code: `<script setup>
import { ref, onMounted } from 'vue';
import { NovuUI } from '@novu/js/ui';

// Function to generate temporary subscriber ID for testing using cryptographically secure random UUID
function getTemporarySubscriberId(): string {
  return 'user-' + crypto.randomUUID();
}

const notificationInbox = ref(null);

onMounted(() => {
  if (!import.meta.env.VITE_NOVU_APP_IDENTIFIER) {
    console.error('VITE_NOVU_APP_IDENTIFIER is not set');
    return;
  }

  const novu = new NovuUI({
    options: {
      applicationIdentifier: import.meta.env.VITE_NOVU_APP_IDENTIFIER,
      subscriberId: import.meta.env.VITE_NOVU_SUBSCRIBER_ID${this.getConfigTemplate({
        backendUrl: import.meta.env.VITE_NOVU_BACKEND_URL,
        socketUrl: import.meta.env.VITE_NOVU_SOCKET_URL,
      })},
    },
  });

  novu.mountComponent({
    name: 'Inbox',
    props: {},
    element: notificationInbox.value,
  });
});
</script>

<template>
  <div ref="notificationInbox"></div>
</template>`,
      notes: [
        'The ref and onMounted hooks are used to manage the DOM element.',
        'The NovuUI class is used to mount the Inbox component.',
        'For production: Replace with dynamic ID from your authentication solution.',
        'Common patterns: useAuth().user?.id, currentUser.value?.id, etc.',
        "Note: subscriberId comes from your app's authentication, not from the Novu dashboard.",
        'Region configuration is automatically included for EU users only.',
        'Make sure to handle loading states properly in your template.',
      ],
    });

    return steps;
  }

  getConfigTemplate(config: NovuConfig): string {
    const configEntries = Object.entries(config)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `,\n      ${key}: '${this.escapeForDoubleQuotes(value)}'`);

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
      `VITE_NOVU_SUBSCRIBER_ID=${this.escapeForDoubleQuotes(subscriberId)}`,
      ...(backendUrl ? [`VITE_NOVU_BACKEND_URL=${this.escapeForDoubleQuotes(backendUrl)}`] : []),
      ...(socketUrl ? [`VITE_NOVU_SOCKET_URL=${this.escapeForDoubleQuotes(socketUrl)}`] : []),
    ];

    return envVars.join('\n');
  }

  getEnvValidationCode(envAccess: string): string {
    return `if (!${envAccess}) {
  console.error('VITE_NOVU_APP_IDENTIFIER is not set');
  return null;
}`;
  }
}
