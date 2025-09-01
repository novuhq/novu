import type { VerificationSteps } from '../types';
import { FrameworkConfigManager } from '../config/framework-config-manager';
import { COMMON_VERIFICATION } from '../config/verification-steps';
import { getEffectiveUrls } from '../strategies/url-utils';

interface VerificationGeneratorOptions {
  framework: string;
  isEuRegion?: boolean;
  applicationIdentifier?: string;
  subscriberId?: string;
  backendUrl?: string;
  socketUrl?: string;
}

export function generateVerificationSteps(options: VerificationGeneratorOptions): VerificationSteps {
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
      `Missing required environment variables: ${validation.missingVars.join(', ')}. Please provide all required values before generating verification steps.`
    );
  }

  const config = configManager.getConfig();
  const steps = [...COMMON_VERIFICATION.steps];
  const consequences = [...COMMON_VERIFICATION.consequences];

  // Add environment-specific verification steps
  if (isEuRegion) {
    steps.push('EU region configuration is properly set up.');
  }

  steps.push(`Environment variable ${config.envVarName} is properly configured.`);
  steps.push('For testing: getTemporarySubscriberId() function is created and used.');
  steps.push('For production: Dynamic subscriber ID is used from authentication solution.');
  steps.push('Instructions for verifying subscriberId in dashboard after integration (not for copying).');
  steps.push('Proper error handling for authentication and environment failures.');
  steps.push('Loading states are implemented for authentication state.');

  // Add verification for provided values
  steps.push('Application identifier is properly configured.');
  steps.push('Subscriber ID is properly used in the component.');

  // Only add backend/socket URL verification if they're provided or required for EU region
  if (isEuRegion || effectiveBackendUrl) {
    steps.push('Backend URL is properly configured.');
  }
  if (isEuRegion || effectiveSocketUrl) {
    steps.push('Socket URL is properly configured.');
  }

  consequences.push("Missing environment variable ⇒ inbox won't load.");
  consequences.push('Hardcoded subscriber ID ⇒ security and functionality issues.');
  consequences.push('No error handling ⇒ poor debugging experience.');
  consequences.push('Missing loading states ⇒ hydration mismatches.');

  // Add framework-specific verification steps
  switch (framework) {
    case 'Next.js':
      steps.push('<Inbox /> is properly placed in the layout file.');
      steps.push('Hydration mismatches are prevented with isLoaded checks.');
      consequences.push('Incorrect placement of <Inbox /> ⇒ no UI renders.');
      consequences.push('No isLoaded check ⇒ hydration errors.');
      break;

    case 'React':
      steps.push('<Inbox /> is properly rendered via a NovuInbox component.');
      steps.push('Loading state is shown while authentication is determined.');
      break;

    case 'JavaScript':
      steps.push('Novu is imported and initialized with proper configuration object.');
      steps.push('novu.notifications.list() is used for fetching notifications.');
      steps.push('Custom UI rendering logic is shown (not pre-built components).');
      steps.push('Real-time event listeners are set up with novu.on().');
      steps.push('Common notification management methods are demonstrated.');
      steps.push('Clear explanation that this is a headless solution.');
      steps.push('Try-catch blocks are used for error handling.');
      consequences.push('Missing applicationIdentifier or subscriberId ⇒ no data fetched.');
      consequences.push('Using initializeInbox() instead of headless methods ⇒ wrong approach.');
      consequences.push('Missing real-time event listeners ⇒ no live updates.');
      consequences.push('No error handling ⇒ silent failures.');
      break;

    case 'Angular':
      steps.push('ViewChild and ElementRef are properly used for DOM reference.');
      steps.push('Try-catch blocks wrap initialization code.');
      consequences.push("Incorrect DOM reference setup ⇒ inbox won't render.");
      consequences.push('No error handling ⇒ initialization failures.');
      break;

    case 'Vue':
      steps.push('Vue 3 Composition API with <script setup> is used.');
      steps.push('ref and onMounted are properly used for DOM reference.');
      steps.push('Loading state is shown in template.');
      consequences.push("Incorrect Vue setup ⇒ inbox won't render.");
      consequences.push('No loading state ⇒ poor UX.');
      break;

    case 'Remix':
      steps.push('NotificationCenter component is created in app/components/notification-center.tsx.');
      steps.push('Loading state is shown while authentication is determined.');
      consequences.push("Missing component setup ⇒ inbox won't render.");
      break;

    case 'Native':
      steps.push('NovuProvider is properly imported and used to wrap components.');
      steps.push('Loading screen is shown while authentication is determined.');
      consequences.push("Missing NovuProvider wrapper ⇒ hooks won't work.");
      break;
  }

  return { steps, consequences };
}
