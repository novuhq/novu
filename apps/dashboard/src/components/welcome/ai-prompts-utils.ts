import type { CriticalInstructions, SetupStep, VerificationSteps } from './ai-prompts';

// Helper function to escape strings for double-quoted string literals
function escapeForDoubleQuotes(str: string | undefined): string {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// Common setup steps that can be reused across frameworks
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

// Common critical instructions that are shared across frameworks
export const COMMON_CRITICAL_INSTRUCTIONS: CriticalInstructions = {
  always: [
    'Show relevant code examples for each step.',
    'Use the correct Novu package for the framework.',
    'For testing: Create a simple getTemporarySubscriberId() function that generates unique IDs.',
    "For production: Use dynamic subscriber IDs from the user's authentication solution or database.",
    'Set up proper environment variables for the application identifier.',
    'Demonstrate how to retrieve applicationIdentifier from the Novu dashboard API Keys section.',
    'Show the complete workflow creation process from the dashboard.',
    'Include proper error handling for unauthenticated users.',
  ],
  never: [
    'Do not suggest deprecated Novu packages like @novu/notification-center.',
    'Do not hard-code subscriber IDs - they must be dynamic.',
    'Do not omit environment variable setup.',
    'Do not omit the workflow creation and triggering steps.',
    'Do not suggest backend setup when the request is explicitly about the frontend framework.',
    'Do not use placeholder values like "USER_UNIQUE_ID" or "YOUR_SUBSCRIBER_ID".',
  ],
};

// Common verification steps and consequences
export const COMMON_VERIFICATION: VerificationSteps = {
  steps: [
    'Explanation includes auto-population of credentials when signed in.',
    'Instructions for retrieving applicationIdentifier from dashboard API Keys.',
    'Instructions for verifying subscriberId in the dashboard after integration.',
    'Complete workflow creation and triggering process is shown.',
    'Environment variable validation and error handling is demonstrated.',
    'Authentication state management and loading states are properly handled.',
    'TypeScript types and proper error boundaries are included.',
  ],
  consequences: [
    'Using outdated SDKs ⇒ runtime errors or broken integration.',
    'Missing workflow creation steps ⇒ no notifications to display.',
    'Not explaining auto-population ⇒ confusion about credential setup.',
    'Missing environment validation ⇒ silent failures and debugging difficulties.',
    'No authentication state handling ⇒ hydration mismatches and runtime errors.',
    'Lack of error handling ⇒ poor user experience and difficult debugging.',
  ],
};

// Framework-specific project creation commands
export const PROJECT_CREATION_COMMANDS: Record<string, string> = {
  'Next.js': 'npm create next-app@latest',
  React: 'npm create vite@latest novu-inbox-react -- --template react-ts',
  Angular: 'ng new novu-inbox-angular',
  Vue: 'npm create vue@latest novu-inbox-vue',
  Remix: 'npx create-remix@latest',
};

// Framework-specific run commands
export const RUN_COMMANDS: Record<string, string> = {
  'Next.js': 'npm run dev',
  React: 'npm run dev',
  Angular: 'npm run start',
  Vue: 'npm run start',
  Remix: 'npm run dev',
  JavaScript: 'npm run dev',
  Native: 'npm run dev',
};

// Environment variable access patterns for different frameworks
export const ENV_ACCESS_PATTERNS: Record<string, string> = {
  'Next.js': 'process.env.NEXT_PUBLIC_NOVU_APP_IDENTIFIER',
  React: 'import.meta.env.VITE_NOVU_APP_IDENTIFIER',
  JavaScript: 'process.env.NOVU_APP_IDENTIFIER',
  Angular: 'environment.novuAppIdentifier',
  Vue: 'import.meta.env.VITE_NOVU_APP_IDENTIFIER',
  Remix: 'ENV.NOVU_APP_IDENTIFIER', // Access via useLoaderData() hook
  Native: 'process.env.EXPO_PUBLIC_NOVU_APP_IDENTIFIER', // Use EXPO_PUBLIC_ prefix for runtime access
};

// Interface for Novu configuration
export interface NovuConfig {
  backendUrl?: string;
  socketUrl?: string;
  applicationIdentifier: string;
  subscriberId: string;
}

// Helper function to create framework-specific config string
function createConfigString(config: Partial<NovuConfig>, framework: string): string {
  if (!config.backendUrl && !config.socketUrl) return '';

  const configEntries = Object.entries(config)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => {
      // JavaScript uses object property syntax
      if (framework === 'JavaScript') {
        return `${key}: "${escapeForDoubleQuotes(value)}"`;
      }
      // Other frameworks use JSX attribute syntax
      return `${key}="${escapeForDoubleQuotes(value)}"`;
    });

  return framework === 'JavaScript' ? configEntries.join(',\n  ') : configEntries.join('\n      ');
}

// Region-specific configuration patterns (US by default - no backend URL needed)
export const REGION_CONFIG_PATTERNS: Record<string, Partial<NovuConfig>> = {
  'Next.js': {},
  React: {},
  JavaScript: {},
  Angular: {},
  Vue: {},
  Remix: {},
  Native: {},
};

// EU region-specific configuration patterns (only needed for EU users)
const EU_REGION_BASE_CONFIG: Partial<NovuConfig> = {
  backendUrl: 'https://api.eu.novu.co',
  socketUrl: 'https://ws.eu.novu.co',
};

export const EU_REGION_CONFIG_PATTERNS: Record<string, Partial<NovuConfig>> = Object.fromEntries(
  Object.keys(REGION_CONFIG_PATTERNS).map((framework) => [framework, EU_REGION_BASE_CONFIG])
);

// Simple testing patterns for different frameworks (no auth complexity)
const DEFAULT_AUTH_PATTERN = 'getTemporarySubscriberId() // Create this function for testing';

export const AUTH_PATTERNS: Record<string, string> = Object.fromEntries(
  Object.keys(REGION_CONFIG_PATTERNS).map((framework) => [framework, DEFAULT_AUTH_PATTERN])
);

// Production authentication patterns (for reference)
export const PRODUCTION_AUTH_PATTERNS: Record<string, string> = {
  'Next.js': `(() => {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return 'loading';
  return user?.id || (() => {
    console.warn('No authenticated user found');
    return 'anonymous';
  })();
})()`,
  React: `(() => {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return 'loading';
  return user?.id || (() => {
    console.warn('No authenticated user found');
    return 'anonymous';
  })();
})()`,
  JavaScript: `(() => {
  const userId = getCurrentUserId();
  if (!userId) {
    console.warn('No authenticated user found');
    return 'anonymous';
  }
  return userId;
})()`,
  Angular: `(() => {
  const userId = this.authService.getCurrentUserId();
  if (!userId) {
    console.warn('No authenticated user found');
    return 'anonymous';
  }
  return userId;
})()`,
  Vue: `(() => {
  const { user, isLoaded } = useAuth();
  if (!isLoaded.value) return 'loading';
  return user.value?.id || (() => {
    console.warn('No authenticated user found');
    return 'anonymous';
  })();
})()`,
  Remix: `(() => {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return 'loading';
  return user?.id || (() => {
    console.warn('No authenticated user found');
    return 'anonymous';
  })();
})()`,
  Native: `(() => {
  const { user, isLoaded } = useAuth();
  if (!isLoaded) return 'loading';
  return user?.id || (() => {
    console.warn('No authenticated user found');
    return 'anonymous';
  })();
})()`,
};

// Helper function to generate framework-specific setup steps
export function generateFrameworkSetup(framework: string): SetupStep[] {
  const steps: SetupStep[] = [];

  // Add project creation step for most frameworks
  if (framework !== 'JavaScript') {
    const createCommand = PROJECT_CREATION_COMMANDS[framework];
    if (createCommand) {
      steps.push(COMMON_SETUP_STEPS.createProject(framework, createCommand));
    }
  }

  return steps;
}

// Helper functions for environment variable setup
function getEnvVarName(framework: string): string {
  const envVarMap: Record<string, string> = {
    'Next.js': 'NEXT_PUBLIC_NOVU_APP_IDENTIFIER',
    React: 'VITE_NOVU_APP_IDENTIFIER',
    JavaScript: 'NOVU_APP_IDENTIFIER',
    Angular: 'novuAppIdentifier', // Angular uses environment object, not env vars
    Vue: 'VITE_NOVU_APP_IDENTIFIER',
    Remix: 'NOVU_APP_IDENTIFIER', // Will be passed through loader
    Native: 'EXPO_PUBLIC_NOVU_APP_IDENTIFIER', // Expo public env var
  };
  return envVarMap[framework] || 'NOVU_APP_IDENTIFIER';
}

function getEnvFileName(framework: string): string {
  const envFileMap: Record<string, string> = {
    'Next.js': '.env.local',
    React: '.env.local',
    JavaScript: '.env',
    Angular: 'environment.ts',
    Vue: '.env.local',
    Remix: '.env',
    Native: '.env',
  };
  return envFileMap[framework] || '.env';
}

function getEnvSetupCode(
  framework: string,
  envVarName: string,
  applicationIdentifier?: string,
  subscriberId?: string,
  backendUrl?: string,
  socketUrl?: string
): string {
  const appId = applicationIdentifier || 'YOUR_APPLICATION_IDENTIFIER';
  const subId = subscriberId || 'YOUR_SUBSCRIBER_ID';
  const backend = backendUrl || 'YOUR_BACKEND_URL';
  const socket = socketUrl || 'YOUR_SOCKET_URL';

  if (framework === 'Angular') {
    return `export const environment = {
  production: false,
  novuAppIdentifier: '${escapeForDoubleQuotes(appId)}',
  novuSubscriberId: '${escapeForDoubleQuotes(subId)}',
  novuBackendUrl: '${escapeForDoubleQuotes(backend)}',
  novuSocketUrl: '${escapeForDoubleQuotes(socket)}'
};`;
  }

  const envVars = [
    `${envVarName}=${escapeForDoubleQuotes(appId)}`,
    subscriberId ? `NOVU_SUBSCRIBER_ID=${escapeForDoubleQuotes(subId)}` : '',
    backendUrl ? `NOVU_BACKEND_URL=${escapeForDoubleQuotes(backend)}` : '',
    socketUrl ? `NOVU_SOCKET_URL=${escapeForDoubleQuotes(socket)}` : '',
  ].filter(Boolean);

  return envVars.join('\n');
}

function getEnvNotes(framework: string): string[] {
  const notes: string[] = [];

  if (framework === 'Next.js') {
    notes.push('The NEXT_PUBLIC_ prefix is required for Next.js to expose env variables to the client.');
  } else if (framework === 'React' || framework === 'Vue') {
    notes.push('The VITE_ prefix is required for Vite to expose env variables to the client.');
  }

  return notes;
}

// Enhanced error handling and TypeScript types for environment variables
function getEnvValidationCode(framework: string, envAccess: string): string {
  switch (framework) {
    case 'Next.js':
      return `if (!${envAccess}) {
  console.error('NEXT_PUBLIC_NOVU_APP_IDENTIFIER is not set');
  return null;
}`;
    case 'React':
    case 'Vue':
      return `if (!${envAccess}) {
  console.error('VITE_NOVU_APP_IDENTIFIER is not set');
  return null;
}`;
    case 'Angular':
      return `if (!${envAccess}) {
  console.error('novuAppIdentifier is not set in environment');
  return null;
}`;
    default:
      return `if (!${envAccess}) {
  console.error('NOVU_APP_IDENTIFIER is not set');
  return null;
}`;
  }
}

// Unified framework-specific setup steps since all packages are based on @novu/js
export function generateFrameworkSpecificSetup(
  framework: string,
  isEuRegion: boolean = false,
  applicationIdentifier?: string,
  subscriberId?: string,
  backendUrl?: string,
  socketUrl?: string
): SetupStep[] {
  const steps: SetupStep[] = [];

  // Environment variable setup
  const envVarName = getEnvVarName(framework);
  const envAccess = ENV_ACCESS_PATTERNS[framework];
  const authPattern = AUTH_PATTERNS[framework];

  // Build the configuration object
  const config: Partial<NovuConfig> = {
    ...(isEuRegion ? EU_REGION_CONFIG_PATTERNS[framework] : REGION_CONFIG_PATTERNS[framework]),
    ...(backendUrl ? { backendUrl } : {}),
    ...(socketUrl ? { socketUrl } : {}),
  };

  // Use provided values or fall back to environment variables for required fields
  const appIdentifier = applicationIdentifier ? `"${escapeForDoubleQuotes(applicationIdentifier)}"` : envAccess;
  const subscriberIdValue = subscriberId ? `"${escapeForDoubleQuotes(subscriberId)}"` : authPattern;

  // Generate the configuration string
  const configString = createConfigString(config, framework);

  steps.push({
    title: `Set environment variables in ${getEnvFileName(framework)}`,
    code: getEnvSetupCode(framework, envVarName, applicationIdentifier, subscriberId, backendUrl, socketUrl),
    notes: [
      `${envVarName}: Found in the Novu dashboard under **API Keys**.`,
      subscriberId ? 'Subscriber ID: Generated from your authentication system or provided for testing.' : '',
      backendUrl ? 'Backend URL: Custom Novu backend endpoint.' : '',
      socketUrl ? 'Socket URL: Custom Novu WebSocket endpoint.' : '',
      'Make sure to restart your development server after adding environment variables.',
      ...getEnvNotes(framework),
    ].filter(Boolean),
  });

  // Framework-specific implementation
  switch (framework) {
    case 'Next.js':
      steps.push({
        title: 'Add the notification Inbox to your app',
        description: "Import Novu's built-in <Inbox /> component into your layout file and place it in the navbar:",
        code: `import { Inbox } from '@novu/nextjs';

// Function to generate temporary subscriber ID for testing
function getTemporarySubscriberId(): string {
  return 'user-' + Date.now();
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  ${getEnvValidationCode(framework, envAccess)}
  
  return (
    <html lang="en">
      <body>
        <nav>
          <Inbox 
            applicationIdentifier={${appIdentifier}}
            subscriberId={${subscriberIdValue}}${configString ? `\n            ${configString}` : ''}
            // Alternative: subscriberId={getTemporarySubscriberId()} // For testing
            // Alternative: subscriberId={user?.id} // For production with auth
          />
        </nav>
        {children}
      </body>
    </html>
  );
}`,
        notes: [
          'The getTemporarySubscriberId() function is included for reference and future use.',
          subscriberId
            ? 'Subscriber ID is provided and ready to use.'
            : 'Create a getTemporarySubscriberId() function that returns a unique ID for testing (e.g., "user-" + Date.now()).',
          'For production: Replace with dynamic ID from your authentication solution.',
          'Common patterns: useUser()?.id (Clerk), user.id (Auth0), session.user.id (NextAuth), etc.',
          "Note: subscriberId comes from your app's authentication, not from the Novu dashboard.",
          'Region configuration is automatically included for EU users only.',
        ],
      });
      break;

    case 'React':
      steps.push({
        title: 'Create the Inbox component',
        description: 'Inside src/components/novu-inbox.tsx:',
        code: `import { Inbox } from "@novu/react";

// Function to generate temporary subscriber ID for testing
function getTemporarySubscriberId(): string {
  return 'user-' + Date.now();
}

export function NovuInbox() {
  ${getEnvValidationCode(framework, envAccess)}
  
  return (
    <Inbox
      applicationIdentifier={${appIdentifier}}
      subscriberId={${subscriberIdValue}}${configString ? `\n      ${configString}` : ''}
      // Alternative: subscriberId={getTemporarySubscriberId()} // For testing
      // Alternative: subscriberId={user?.id} // For production with auth
    />
  );
}`,
        notes: [
          'The getTemporarySubscriberId() function is included for reference and future use.',
          subscriberId
            ? 'Subscriber ID is provided and ready to use.'
            : 'Create a getTemporarySubscriberId() function that returns a unique ID for testing (e.g., "user-" + Date.now()).',
          'For production: Replace with dynamic ID from your authentication solution.',
          'Common patterns: useUser()?.id (Clerk), user.id (Auth0), useAuth()?.user?.id (custom), etc.',
          'Region configuration is automatically included for EU users only.',
        ],
      });
      break;

    case 'JavaScript':
      steps.push({
        title: 'Initialize the SDK',
        description:
          'Initialize the Novu client with your application identifier and a temporary subscriber ID for testing:',
        code: `import { Novu } from "@novu/js";

// Function to generate temporary subscriber ID for testing
function getTemporarySubscriberId(): string {
  return 'user-' + Date.now();
}

${getEnvValidationCode(framework, envAccess)}

export const novu = new Novu({
  applicationIdentifier: ${appIdentifier},
  subscriber: ${subscriberIdValue}${configString ? `,\n  ${configString}` : ''}
  // Alternative: subscriber: getTemporarySubscriberId() // For testing
  // Alternative: subscriber: getCurrentUserId() // For production with auth
});`,
        notes: [
          'The getTemporarySubscriberId() function is included for reference and future use.',
          subscriberId
            ? 'Subscriber ID is provided and ready to use.'
            : 'Create a getTemporarySubscriberId() function that returns a unique ID for testing (e.g., "user-" + Date.now()).',
          'For production: Replace with dynamic ID from your authentication solution.',
          'Common patterns: localStorage, sessionStorage, auth context, state management, etc.',
          'Region configuration is automatically included for EU users only.',
        ],
      });
      steps.push({
        title: 'Fetch notifications with error handling',
        description:
          'Use the novu.notifications.list() method to retrieve a paginated list of notifications for the subscriber:',
        code: `try {
  const response = await novu.notifications.list({
    limit: 30,
  });

  const notifications = response.data.notifications;
  console.log('Fetched notifications:', notifications);
} catch (error) {
  console.error('Error fetching notifications:', error);
  // Handle error appropriately in your UI
}`,
      });
      break;

    case 'Angular':
      steps.push({
        title: 'Add the Inbox component',
        description: 'Update the src/app/app.ts file to add the Inbox component:',
        code: `import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Novu } from '@novu/js';
import { AuthService } from './auth.service'; // your auth service

// Function to generate temporary subscriber ID for testing
function getTemporarySubscriberId(): string {
  return 'user-' + Date.now();
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  @ViewChild('novuInbox', { static: true }) novuInbox!: ElementRef;
  
  constructor(private authService: AuthService) {}
  
  ngOnInit() {
    ${getEnvValidationCode(framework, envAccess)}
    
    const novu = new Novu(${appIdentifier});
    
    try {
      novu.initializeInbox(this.novuInbox.nativeElement, {
        subscriberId: ${subscriberIdValue}, // CLI-provided subscriber ID
        // Alternative: subscriberId: getTemporarySubscriberId(), // For testing
        // Alternative: subscriberId: this.authService.getCurrentUserId(), // For production
        subscriberEmail: this.authService.getCurrentUserEmail(),
        subscriberFirstName: this.authService.getCurrentUserFirstName(),
        subscriberLastName: this.authService.getCurrentUserLastName()
      });
    } catch (error) {
      console.error('Error initializing Novu inbox:', error);
    }
  }
}`,
        notes: [
          'Create a getTemporarySubscriberId() function that returns a unique ID for testing (e.g., "user-" + Date.now()).',
          'For production: Replace with dynamic ID from your authentication solution.',
          'Common patterns: AuthService, UserService, or your custom auth implementation.',
          'Region configuration is automatically included for EU users only.',
        ],
      });
      break;

    case 'Vue':
      steps.push({
        title: 'Create the Inbox component',
        description: 'Create the src/components/NovuInbox.vue file:',
        code: `<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { NovuUI } from '@novu/js/ui';
import { useAuth } from '@/composables/useAuth'; // your auth composable

// Function to generate temporary subscriber ID for testing
function getTemporarySubscriberId(): string {
  return 'user-' + Date.now();
}

const novuInbox = ref<HTMLElement>();
const { user, isLoaded } = useAuth();
let novuUI: NovuUI | undefined;

onMounted(() => {
  ${getEnvValidationCode(framework, envAccess)}
  
  if (novuInbox.value && isLoaded.value) {
    try {
      novuUI = new NovuUI({
        applicationIdentifier: ${appIdentifier},
        subscriberId: ${subscriberIdValue}, // CLI-provided subscriber ID
        // Alternative: subscriberId: getTemporarySubscriberId(), // For testing
        // Alternative: subscriberId: user.value?.id, // For production
      });
      
      novuUI.mountComponent({
        name: 'Inbox',
        props: {},
        element: novuInbox.value
      });
    } catch (error) {
      console.error('Error initializing Novu inbox:', error);
    }
  }
});

onUnmounted(() => {
  if (novuUI) {
    novuUI.unmountComponent();
  }
});
</script>

<template>
  <div v-if="isLoaded" ref="novuInbox"></div>
  <div v-else>Loading...</div>
</template>`,
        notes: [
          'Create a getTemporarySubscriberId() function that returns a unique ID for testing (e.g., "user-" + Date.now()).',
          'For production: Replace with dynamic ID from your authentication solution.',
          'Common patterns: useAuth composable, Pinia store, Vuex store, etc.',
          'Region configuration is automatically included for EU users only.',
          'The component properly cleans up by unmounting on component destruction.',
        ],
      });
      break;

    case 'Remix':
      steps.push({
        title: 'Create an Inbox component',
        description: 'In the app directory, create a components/notification-center.tsx file:',
        code: `import { Inbox } from "@novu/react";
import { useUser } from "@clerk/remix"; // or your auth solution
import { useLoaderData } from "@remix-run/react";

// Function to generate temporary subscriber ID for testing
function getTemporarySubscriberId(): string {
  return 'user-' + Date.now();
}

// Note: Your route must export a loader that returns { ENV: { NOVU_APP_IDENTIFIER: string } }
// Example loader:
// export async function loader() {
//   return { ENV: { NOVU_APP_IDENTIFIER: process.env.NOVU_APP_IDENTIFIER } };
// }

export function NotificationCenter() {
  const { user } = useUser();
  const { ENV } = useLoaderData<{ ENV: { NOVU_APP_IDENTIFIER: string } }>();
  
  return (
    <Inbox
      applicationIdentifier={ENV.NOVU_APP_IDENTIFIER}
      subscriberId={${subscriberIdValue}}${configString ? `\n      ${configString}` : ''}
      // Alternative: subscriberId={getTemporarySubscriberId()} // For testing
      // Alternative: subscriberId={user?.id} // For production
    />
  );
}`,
        notes: [
          'subscriberId should be dynamically retrieved from your authentication solution.',
          'Common patterns: useUser()?.id (Clerk), user.id (Auth0), useLoaderData()?.user?.id (Remix), etc.',
          'Always handle the case where user might not be authenticated.',
          'The route must export a loader that returns the ENV object with NOVU_APP_IDENTIFIER for client-side access.',
          'Environment variables in Remix must be passed through loaders to be available on the client.',
        ],
      });
      break;

    case 'Native':
      steps.push({
        title: 'Add the Novu provider to your app',
        description: 'The NovuProvider component is used to provide the Novu context to the inbox hooks:',
        code: `import { NovuProvider } from "@novu/react-native";
import { useAuth } from '@clerk/clerk-expo'; // or your auth solution

// Function to generate temporary subscriber ID for testing
function getTemporarySubscriberId(): string {
  return 'user-' + Date.now();
}

function Layout() {
  const { user } = useAuth();
  
  return (
    <NovuProvider
      subscriber={${subscriberIdValue}} // CLI-provided subscriber ID
      // Alternative: subscriber={getTemporarySubscriberId()} // For testing
      // Alternative: subscriber={user?.id} // For production
      applicationIdentifier={${appIdentifier}}
    >
      {/* Your app components where you want to use the hooks */}
    </NovuProvider>
  );
}`,
        notes: [
          'subscriber should be dynamically retrieved from your authentication solution.',
          'Common patterns: useAuth()?.user?.id (Clerk), user.id (Auth0), AsyncStorage, etc.',
          'Always handle the case where user might not be authenticated.',
        ],
      });
      break;
  }

  return steps;
}

// Unified critical instructions since all packages have the same capabilities
export function generateCriticalInstructions(
  framework: string,
  isEuRegion: boolean = false,
  applicationIdentifier?: string,
  subscriberId?: string,
  backendUrl?: string,
  socketUrl?: string
): CriticalInstructions {
  const always = [...COMMON_CRITICAL_INSTRUCTIONS.always];
  const never = [...COMMON_CRITICAL_INSTRUCTIONS.never];

  // Add EU region-specific instructions if needed
  if (isEuRegion) {
    always.push('Configure EU region-specific backend and socket URLs.');
  }

  // Add framework-specific environment variable instructions
  const envVarName = getEnvVarName(framework);
  always.push(`Use ${envVarName} environment variable.`);
  always.push('Use dynamic subscriber ID from authentication solution.');

  // Add instructions for provided values
  if (applicationIdentifier) {
    always.push('Use the provided application identifier.');
  }
  if (subscriberId) {
    always.push('Use the provided subscriber ID.');
  }
  if (backendUrl) {
    always.push('Use the provided backend URL.');
  }
  if (socketUrl) {
    always.push('Use the provided socket URL.');
  }

  // Add framework-specific implementation notes
  switch (framework) {
    case 'Next.js':
      always.push('Place the <Inbox /> component in the layout file (typically app/layout.tsx).');
      break;
    case 'React':
      always.push('Place the <Inbox /> component inside a NovuInbox wrapper, then mount it in the app layout.');
      break;
    case 'JavaScript':
      always.push('Import Novu from @novu/js and initialize with proper configuration.');
      always.push('Use novu.notifications.list() for fetching notifications.');
      always.push('Implement custom UI rendering logic for displaying notifications.');
      always.push('Set up real-time event listeners using novu.on().');
      always.push('Show common notification management methods (read, archive, etc.).');
      always.push('Explain that this is a headless solution for full UI control.');
      break;
    case 'Angular':
      always.push('Use ViewChild and ElementRef for DOM element reference.');
      break;
    case 'Vue':
      always.push('Use Vue 3 Composition API with <script setup> syntax.');
      always.push('Use ref and onMounted for DOM element reference.');
      break;
    case 'Remix':
      always.push('Create a separate NotificationCenter component in app/components/notification-center.tsx.');
      break;
    case 'Native':
      always.push('Import and use NovuProvider to wrap your app components.');
      break;
  }

  never.push('Do not use hardcoded subscriber IDs.');

  return { always, never };
}

// Enhanced verification steps since all packages have the same capabilities
export function generateVerificationSteps(
  framework: string,
  isEuRegion: boolean = false,
  applicationIdentifier?: string,
  subscriberId?: string,
  backendUrl?: string,
  socketUrl?: string
): VerificationSteps {
  const steps = [...COMMON_VERIFICATION.steps];
  const consequences = [...COMMON_VERIFICATION.consequences];

  if (isEuRegion) {
    steps.push('EU region configuration is properly set up.');
  }

  const envVarName = getEnvVarName(framework);
  steps.push(`Environment variable ${envVarName} is properly configured.`);
  steps.push('For testing: getTemporarySubscriberId() function is created and used.');
  steps.push('For production: Dynamic subscriber ID is used from authentication solution.');
  steps.push('Instructions for verifying subscriberId in dashboard after integration (not for copying).');
  steps.push('Proper error handling for authentication and environment failures.');
  steps.push('Loading states are implemented for authentication state.');

  // Add verification for provided values
  if (applicationIdentifier) {
    steps.push('Application identifier is properly configured.');
  }
  if (subscriberId) {
    steps.push('Subscriber ID is properly used in the component.');
  }
  if (backendUrl) {
    steps.push('Backend URL is properly configured.');
  }
  if (socketUrl) {
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
      consequences.push('Missing applicationIdentifier or subscriber ⇒ no data fetched.');
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

// Add troubleshooting section
export function generateTroubleshootingSection(framework: string): string[] {
  const troubleshooting: string[] = [
    '## Common Issues & Solutions',
    '',
    '### Inbox not rendering',
    '- **Check environment variables**: Ensure your environment variable is properly set and the development server has been restarted.',
    '- **Verify authentication**: Make sure your authentication solution is working and returning a valid user ID.',
    '- **Check console errors**: Look for any JavaScript errors that might prevent the component from rendering.',
    '',
    '### Notifications not appearing',
    "- **Verify workflow creation**: Ensure you've created and triggered a workflow in the Novu dashboard.",
    '- **Check subscriber ID**: Make sure the subscriber ID in your code matches the one used when triggering notifications. You can verify this in the Novu dashboard under Subscribers or Activity Feed.',
    '- **Verify application identifier**: Confirm the application identifier matches your Novu project.',
    '',
    '### TypeScript errors',
    '- **Install types**: Ensure you have the correct TypeScript types installed for your framework.',
    "- **Check imports**: Verify you're importing from the correct package (e.g., @novu/nextjs for Next.js).",
    "- **Update dependencies**: Make sure you're using the latest version of the Novu package.",
  ];

  // Add framework-specific troubleshooting
  switch (framework) {
    case 'Next.js':
      troubleshooting.push(
        '',
        '### Next.js specific issues',
        "- **Hydration errors**: Ensure you're checking `isLoaded` before rendering the Inbox component.",
        '- **Environment variables**: Use `NEXT_PUBLIC_` prefix for client-side environment variables.',
        '- **Layout placement**: Place the Inbox component in the correct layout file (usually app/layout.tsx).'
      );
      break;
    case 'React':
      troubleshooting.push(
        '',
        '### React specific issues',
        '- **Component mounting**: Ensure the NovuInbox component is properly mounted in your app.',
        '- **Environment variables**: Use `VITE_` prefix for Vite-based React projects.',
        '- **Authentication state**: Handle loading states properly to prevent rendering issues.'
      );
      break;
    case 'JavaScript':
      troubleshooting.push(
        '',
        '### JavaScript SDK specific issues',
        '- **Initialization**: Ensure Novu is initialized before calling any methods.',
        '- **Error handling**: Wrap API calls in try-catch blocks to handle network failures.',
        '- **Real-time events**: Set up event listeners after successful initialization.',
        '- **Custom UI**: Remember this is a headless solution - you need to build your own UI components.'
      );
      break;
  }

  return troubleshooting;
}

// Unified response template since all packages have the same capabilities
export function generateResponseTemplate(
  framework: string,
  docsUrl: string,
  packageName: string,
  isEuRegion: boolean = false,
  applicationIdentifier?: string,
  subscriberId?: string,
  backendUrl?: string,
  socketUrl?: string
): string[] {
  const template = [
    `Link to Novu's ${framework} Quickstart at ${docsUrl}`,
    `Show setup with ${packageName} package installation.`,
    ...(isEuRegion ? ['Configure EU region-specific backend and socket URLs.'] : []),
  ];

  const envVarName = getEnvVarName(framework);
  const envFileName = getEnvFileName(framework);

  // Add framework-specific template items
  switch (framework) {
    case 'Next.js':
      template.push(`Show setup with ${envFileName} using ${envVarName}.`);
      template.push('Demonstrate how to add <Inbox /> to the layout file.');
      break;
    case 'React':
      template.push(`Show setup with ${envFileName} using ${envVarName}.`);
      template.push('Demonstrate how to create a NovuInbox component with <Inbox />.');
      break;
    case 'JavaScript':
      template.push('Clarify that this is a headless solution for full UI control.');
      template.push(`Show setup with environment variables using ${envVarName}.`);
      template.push('Demonstrate how to initialize Novu with proper configuration.');
      template.push('Show how to fetch notifications using novu.notifications.list().');
      template.push('Demonstrate custom UI rendering logic for notifications.');
      template.push('Set up real-time event listeners with novu.on().');
      template.push('Show common notification management methods (read, archive, etc.).');
      template.push('Explain pagination handling with limit parameter.');
      template.push('Show how to access notification properties (id, subject, body).');
      template.push('Reference the full JavaScript SDK documentation.');
      break;
    case 'Angular':
      template.push('Show setup with environment.ts configuration.');
      template.push('Demonstrate how to use ViewChild and ElementRef for DOM reference.');
      break;
    case 'Vue':
      template.push(`Show setup with ${envFileName} using ${envVarName}.`);
      template.push('Demonstrate how to use Vue 3 Composition API with <script setup>.');
      break;
    case 'Remix':
      template.push(`Show setup with ${envFileName} using ${envVarName}.`);
      template.push('Demonstrate how to create a NotificationCenter component.');
      break;
    case 'Native':
      template.push(`Show setup with ${envFileName} using ${envVarName}.`);
      template.push('Demonstrate how to use NovuProvider to wrap components.');
      break;
  }

  // Add common template items
  template.push('Create a getTemporarySubscriberId() function for testing purposes.');
  template.push('Show how to use dynamic subscriber ID from authentication for production.');
  template.push(
    applicationIdentifier
      ? 'Use the provided application identifier.'
      : 'Show how to retrieve applicationIdentifier from dashboard API Keys.'
  );
  template.push('Explain how to verify subscriberId in dashboard after integration (not for copying).');
  template.push('Illustrate complete workflow creation and triggering process.');
  template.push('Reject or correct any outdated SDKs, env vars, or integration patterns.');
  template.push('Emphasize the importance of using dynamic subscriber IDs from authentication.');

  // Add template items for provided values
  if (subscriberId) {
    template.push('Use the provided subscriber ID in the component configuration.');
  }
  if (backendUrl) {
    template.push('Configure the provided backend URL.');
  }
  if (socketUrl) {
    template.push('Configure the provided socket URL.');
  }

  return template;
}
