import type { NovuConfig } from '../config/environment-config';
import type { SetupStep } from '../types/framework';
import { BaseFrameworkStrategy, Environment } from './framework-strategy';

export class RemixStrategy extends BaseFrameworkStrategy {
  constructor() {
    super({
      envVarName: 'NOVU_APP_IDENTIFIER',
      envFileName: '.env',
      packageName: '@novu/react',
      docsUrl: 'https://docs.novu.co/platform/inbox/remix',
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
        'Environment variables will be passed through the loader.',
      ],
    });

    // Add component implementation step
    steps.push({
      title: 'Add the notification Inbox to your app',
      description: 'Create a NotificationCenter component and use it in your layout:',
      code: `// app/components/notification-center.tsx
import { Inbox } from '@novu/react';
import { useNavigate } from '@remix-run/react';

// Function to generate temporary subscriber ID for testing using cryptographically secure random UUID
function getTemporarySubscriberId(): string {
  return 'user-' + crypto.randomUUID();
}

export function NotificationCenter() {
  const navigate = useNavigate();
  const ENV = window.ENV;

  if (!ENV.NOVU_APP_IDENTIFIER) {
    console.error('NOVU_APP_IDENTIFIER is not set');
    return null;
  }

  return (
    <Inbox 
      applicationIdentifier="${this.escapeForDoubleQuotes(applicationIdentifier)}"
      subscriberId="${this.escapeForDoubleQuotes(subscriberId)}"${this.getConfigTemplate({
        backendUrl,
        socketUrl,
        applicationIdentifier: applicationIdentifier || '',
        subscriberId: subscriberId || '',
      })}
      routerPush={(path: string) => navigate(path)}
      // Alternative: subscriberId={getTemporarySubscriberId()} // For testing
      // Alternative: subscriberId={user?.id} // For production with auth
    />
  );
}

// root.tsx
import { json } from '@remix-run/node';
import { useLoaderData, Outlet } from '@remix-run/react';
import { NotificationCenter } from '~/components/notification-center';

export async function loader() {
  return json({
    ENV: {
      NOVU_APP_IDENTIFIER: process.env.NOVU_APP_IDENTIFIER,
      NOVU_SUBSCRIBER_ID: process.env.NOVU_SUBSCRIBER_ID,${backendUrl ? `\n      NOVU_BACKEND_URL: process.env.NOVU_BACKEND_URL,` : ''}${socketUrl ? `\n      NOVU_SOCKET_URL: process.env.NOVU_SOCKET_URL,` : ''}
    },
  });
}

export default function App() {
  const data = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: \`window.ENV = \${JSON.stringify(data.ENV)}\`,
          }}
        />
      </head>
      <body>
        <nav>
          <NotificationCenter />
        </nav>
        <Outlet />
      </body>
    </html>
  );
}`,
      notes: [
        'Environment variables are passed through the loader to the client.',
        'The getTemporarySubscriberId() function is included for reference and future use.',
        'For production: Replace with dynamic ID from your authentication solution.',
        'Common patterns: useUser()?.id (Clerk), user.id (Auth0), session.user.id (AuthJS), etc.',
        "Note: subscriberId comes from your app's authentication, not from the Novu dashboard.",
        'Region configuration is automatically included for EU users only.',
        'The routerPush prop enables navigation within your notifications.',
      ],
    });

    return steps;
  }

  getConfigTemplate(config: NovuConfig): string {
    const configEntries = Object.entries(config)
      .filter(([key, value]) => value !== undefined && !['applicationIdentifier', 'subscriberId'].includes(key))
      .map(([key, value]) => `\n      ${key}="${this.escapeForDoubleQuotes(value)}"`);

    return configEntries.join('');
  }

  getEnvSetupCode(env: Environment): string {
    const { applicationIdentifier, subscriberId, backendUrl, socketUrl } = env;
    const validation = this.validateEnvironment(env);

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
    return `if (!${envAccess}) {
  console.error('NOVU_APP_IDENTIFIER is not set');
  return null;
}`;
  }
}
