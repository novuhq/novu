import { NovuConfig } from '../config/environment-config';
import type { SetupStep } from '../types/framework';
import { BaseFrameworkStrategy, Environment } from './framework-strategy';

export class NextJSStrategy extends BaseFrameworkStrategy {
  constructor() {
    super({
      envVarName: 'NEXT_PUBLIC_NOVU_APP_IDENTIFIER',
      envFileName: '.env.local',
      packageName: '@novu/nextjs',
      docsUrl: 'https://docs.novu.co/platform/inbox/nextjs',
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
        'The NEXT_PUBLIC_ prefix is required for Next.js to expose env variables to the client.',
      ],
    });

    // Add component implementation step
    steps.push({
      title: 'Add the notification Inbox to your app',
      description: "Import Novu's built-in <Inbox /> component into your layout file and place it in the navbar:",
      code: `import { Inbox } from '@novu/nextjs';

// Function to generate temporary subscriber ID for testing using cryptographically secure random UUID
function getTemporarySubscriberId(): string {
  return 'user-' + crypto.randomUUID();
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  ${this.getEnvValidationCode('process.env.NEXT_PUBLIC_NOVU_APP_IDENTIFIER')}
  
  return (
    <html lang="en">
      <body>
        <nav>
          <Inbox 
            applicationIdentifier="${this.escapeForDoubleQuotes(applicationIdentifier)}"
            subscriberId="${this.escapeForDoubleQuotes(subscriberId)}"${this.getConfigTemplate({
              backendUrl,
              socketUrl,
            })}
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
        'Subscriber ID is provided and ready to use.',
        'For production: Replace with dynamic ID from your authentication solution.',
        'Common patterns: useUser()?.id (Clerk), user.id (Auth0), session.user.id (NextAuth), etc.',
        "Note: subscriberId comes from your app's authentication, not from the Novu dashboard.",
        'Region configuration is automatically included for EU users only.',
      ],
    });

    return steps;
  }

  getConfigTemplate(config: NovuConfig): string {
    const safeAttributePattern = /^[A-Za-z0-9_-]+$/;

    const configEntries = Object.entries(config)
      .filter(([key, value]) => {
        if (value === undefined) return false;
        if (!safeAttributePattern.test(key)) {
          console.warn(`Skipping invalid config key: "${key}". Keys must match pattern: ${safeAttributePattern}`);
          return false;
        }
        return true;
      })
      .map(([key, value]) => `${key}="${this.escapeForDoubleQuotes(value)}"`);

    return configEntries.length ? `\n            ${configEntries.join('\n            ')}` : '';
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
  console.error('NEXT_PUBLIC_NOVU_APP_IDENTIFIER is not set');
  return null;
}`;
  }
}
