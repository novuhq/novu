import { FrameworkConfigManager } from '../config/framework-config-manager';
import { getEffectiveUrls } from '../strategies/url-utils';

interface ResponseTemplateOptions {
  framework: string;
  isEuRegion?: boolean;
  applicationIdentifier?: string;
  subscriberId?: string;
  backendUrl?: string;
  socketUrl?: string;
}

export function generateResponseTemplate(options: ResponseTemplateOptions): string[] {
  const { framework, isEuRegion = false, applicationIdentifier, subscriberId, backendUrl, socketUrl } = options;

  const configManager = new FrameworkConfigManager(framework);
  const { effectiveBackendUrl, effectiveSocketUrl } = getEffectiveUrls(backendUrl, socketUrl);

  // Validate environment using the framework config manager
  const validation = configManager.validateEnvironment({
    applicationIdentifier,
    subscriberId,
    backendUrl: effectiveBackendUrl,
    socketUrl: effectiveSocketUrl,
    isEuRegion,
  });

  if (!validation.isValid) {
    throw new Error(
      `Missing required environment variables: ${validation.missingVars.join(', ')}. Please provide all required values before generating response template.`
    );
  }

  const config = configManager.getConfig();
  const template = [
    `Link to Novu's ${framework} Quickstart at ${config.docsUrl}`,
    `Show setup with ${config.packageName} package installation.`,
    ...(isEuRegion ? ['Configure EU region-specific backend and socket URLs.'] : []),
  ];

  // Add framework-specific template items
  switch (framework) {
    case 'Next.js':
      template.push(
        `Show setup with ${config.envFileName} using ${config.envVarName}.`,
        'Demonstrate how to add <Inbox /> to the layout file.'
      );
      break;

    case 'React':
      template.push(
        `Show setup with ${config.envFileName} using ${config.envVarName}.`,
        'Demonstrate how to create a NovuInbox component with <Inbox />.'
      );
      break;

    case 'JavaScript':
      template.push(
        'Clarify that this is a headless solution for full UI control.',
        `Show setup with environment variables using ${config.envVarName}.`,
        'Demonstrate how to initialize Novu with proper configuration.',
        'Show how to fetch notifications using novu.notifications.list().',
        'Demonstrate custom UI rendering logic for notifications.',
        'Set up real-time event listeners with novu.on().',
        'Show common notification management methods (read, archive, etc.).',
        'Explain pagination handling with limit parameter.',
        'Show how to access notification properties (id, subject, body).',
        'Reference the full JavaScript SDK documentation.'
      );
      break;

    case 'Angular':
      template.push(
        'Show setup with environment.ts configuration.',
        'Demonstrate how to use ViewChild and ElementRef for DOM reference.'
      );
      break;

    case 'Vue':
      template.push(
        `Show setup with ${config.envFileName} using ${config.envVarName}.`,
        'Demonstrate how to use Vue 3 Composition API with <script setup>.'
      );
      break;

    case 'Remix':
      template.push(
        `Show setup with ${config.envFileName} using ${config.envVarName}.`,
        'Demonstrate how to create a NotificationCenter component.'
      );
      break;

    case 'Native':
      template.push(
        `Show setup with ${config.envFileName} using ${config.envVarName}.`,
        'Demonstrate how to use NovuProvider to wrap components.'
      );
      break;
  }

  // Add common template items
  template.push(
    'Create a getTemporarySubscriberId() function for testing purposes.',
    'Show how to use dynamic subscriber ID from authentication for production.',
    'Use the provided application identifier.',
    'Explain how to verify subscriberId in dashboard after integration (not for copying).',
    'Illustrate complete workflow creation and triggering process.',
    'Reject or correct any outdated SDKs, env vars, or integration patterns.',
    'Emphasize the importance of using dynamic subscriber IDs from authentication.'
  );

  // Add template items for provided values
  if (subscriberId) {
    template.push('Use the provided subscriber ID in the component configuration.');
  }

  // Only add backend/socket URL template items if they're provided or required for EU region
  if (isEuRegion || effectiveBackendUrl) {
    template.push('Configure the provided backend URL.');
  }
  if (isEuRegion || effectiveSocketUrl) {
    template.push('Configure the provided socket URL.');
  }

  return template;
}
