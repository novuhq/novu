import { FrameworkConfigManager } from '../config/framework-config-manager';
import { getEffectiveUrls } from '../strategies/url-utils';
import type { SetupStep } from '../types/framework';

export const COMMON_SETUP_STEPS = {
  installPackage: (packageName: string): SetupStep => ({
    title: `Install ${packageName}`,
    code: `npm install ${packageName}`,
  }),

  createProject: (framework: string, command: string): SetupStep => ({
    title: `Create a ${framework} project`,
    code: command,
  }),

  runApp: (command: string): SetupStep => ({
    title: 'Run your application',
    code: command,
    description:
      'Once the application is running, a bell icon will appear in the navbar. Clicking it opens the notification inbox UI.',
  }),

  triggerNotification: (): SetupStep => ({
    title: 'Trigger your first notification',
    description: 'Create a simple workflow to send your first notification via the Inbox component:',
    code: 'Follow the steps in the Novu dashboard to create and trigger a workflow.',
    notes: [
      'Go to your [Novu dashboard](https://dashboard.novu.co/auth/sign-in).',
      'In the sidebar, click **Workflows**.',
      'Click **Create Workflow**. Enter a name for your workflow (e.g., "Welcome Notification").',
      'Click **Create Workflow** to save it.',
      'Click the **Add Step** icon in the workflow editor and then select **In-App** as the step type.',
      'In the In-App template editor, enter the following:',
      '- **Subject**: "Welcome to Novu"',
      '- **Body**: "Hello, world!"',
      "Once you've added the subject and body, close the editor.",
      'Click **Trigger**.',
      'Click **Test Workflow**.',
    ],
  }),

  viewNotification: (): SetupStep => ({
    title: 'View the notification in your app',
    description:
      'Go back to your app, then click the bell icon. You should see the notification you just sent from Novu! 🎉',
    code: 'Click the bell icon in your app to view the notification.',
  }),
};

interface SetupGeneratorOptions {
  framework: string;
  isEuRegion?: boolean;
  applicationIdentifier?: string;
  subscriberId?: string;
  backendUrl?: string;
  socketUrl?: string;
  codeSnippet?: string;
}

export function generateFrameworkSetup(options: SetupGeneratorOptions): SetupStep[] {
  const {
    framework,
    isEuRegion = false,
    applicationIdentifier,
    subscriberId,
    backendUrl,
    socketUrl,
    codeSnippet,
  } = options;

  const configManager = new FrameworkConfigManager(framework);
  const { effectiveBackendUrl, effectiveSocketUrl } = getEffectiveUrls(backendUrl, socketUrl);

  const steps: SetupStep[] = [];
  const config = configManager.getConfig();

  // Add project creation step for most frameworks
  if (framework !== 'JavaScript') {
    const createCommand = configManager.getProjectCreationCommand();
    if (createCommand) {
      steps.push(COMMON_SETUP_STEPS.createProject(framework, createCommand));
    }
  }

  // Add package installation step
  steps.push(COMMON_SETUP_STEPS.installPackage(config.packageName));

  // Add environment setup step
  const envVars = [`${config.envVarName}=${applicationIdentifier || 'YOUR_APPLICATION_IDENTIFIER'}`];
  const envNotes = [
    'Get your application identifier from the Novu dashboard:',
    '1. Go to **Settings** > **API Keys**',
    '2. Copy your Application Identifier',
  ];

  if (isEuRegion || effectiveBackendUrl || effectiveSocketUrl) {
    if (effectiveBackendUrl) {
      envVars.push(`NOVU_BACKEND_URL=${effectiveBackendUrl}`);
    }
    if (effectiveSocketUrl) {
      envVars.push(`NOVU_SOCKET_URL=${effectiveSocketUrl}`);
    }
    envNotes.push('EU region or custom URLs are configured automatically.');
  }

  if (subscriberId) {
    envVars.push(`// For testing only - use your authentication system's user ID in production`);
    envVars.push(`NOVU_SUBSCRIBER_ID=${subscriberId}`);
  }

  steps.push({
    title: 'Configure environment variables',
    description: `Set up the required environment variables in your ${config.envFileName} file:`,
    code: envVars.join('\n'),
    notes: envNotes,
  });

  // Add framework-specific setup steps
  const frameworkInstructions = configManager.getFrameworkSpecificInstructions();
  if (frameworkInstructions.length > 0) {
    steps.push({
      title: 'Framework-specific setup',
      description: 'Follow these framework-specific instructions:',
      code: '',
      notes: frameworkInstructions,
    });
  }

  // Add Inbox component step
  if (codeSnippet) {
    steps.push({
      title: 'Add the notification Inbox to your app',
      description: `Import Novu's built-in <Inbox /> component and configure it:`,
      code: codeSnippet,
      notes: [
        'This code snippet is ready to use with your specific configuration.',
        'The backendUrl and socketUrl are automatically included when needed.',
        'For production: Replace the subscriberId with dynamic ID from your authentication solution.',
        'Common patterns: useUser()?.id (Clerk), user.id (Auth0), session.user.id (NextAuth), etc.',
      ],
    });
  }

  // Add run application step
  const runCommand = configManager.getRunCommand();
  if (runCommand) {
    steps.push(COMMON_SETUP_STEPS.runApp(runCommand));
  }

  // Add notification trigger and view steps
  steps.push(COMMON_SETUP_STEPS.triggerNotification());
  steps.push(COMMON_SETUP_STEPS.viewNotification());

  return steps;
}
