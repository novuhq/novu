import { SetupStep } from '../ai-prompts-utils';
import { NovuConfig } from '../config/environment-config';
import { BaseFrameworkStrategy, Environment } from './framework-strategy';

export class ReactStrategy extends BaseFrameworkStrategy {
  constructor() {
    super({
      envVarName: 'VITE_NOVU_APP_IDENTIFIER',
      envFileName: '.env.local',
      packageName: '@novu/react',
      docsUrl: 'https://docs.novu.co/platform/inbox/react',
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
      description: "Import Novu's built-in <Inbox /> component and configure it with your router:",
      code: `import { Inbox } from '@novu/react';
import { useNavigate } from 'react-router-dom';

// Function to generate temporary subscriber ID for testing using cryptographically secure random UUID
function getTemporarySubscriberId(): string {
  return 'user-' + crypto.randomUUID();

export function NotificationCenter() {
  const navigate = useNavigate();
  ${this.getEnvValidationCode('import.meta.env.VITE_NOVU_APP_IDENTIFIER')}

  return (
    <Inbox 
      applicationIdentifier="${this.escapeForDoubleQuotes(applicationIdentifier)}"
      subscriberId="${this.escapeForDoubleQuotes(subscriberId)}"${this.getConfigTemplate({
        backendUrl,
        socketUrl,
      })}
      routerPush={(path: string) => navigate(path)}
      // Alternative: subscriberId={getTemporarySubscriberId()} // For testing
      // Alternative: subscriberId={user?.id} // For production with auth
    />
  );
}`,
      notes: [
        'The getTemporarySubscriberId() function is included for reference and future use.',
        'Subscriber ID is provided and ready to use.',
        'For production: Replace with dynamic ID from your authentication solution.',
        'Common patterns: useUser()?.id (Clerk), user.id (Auth0), etc.',
        "Note: subscriberId comes from your app's authentication, not from the Novu dashboard.",
        'Region configuration is automatically included for EU users only.',
        'The routerPush prop enables navigation within your notifications.',
      ],
    });

    return steps;
  }

  getConfigTemplate(config: NovuConfig): string {
    // applicationIdentifier and subscriberId are provided as explicit attributes to <Inbox>
    // and take precedence over any values in the config object
    const configEntries = Object.entries(config)
      .filter(
        ([key, value]) =>
          value !== undefined &&
          // Exclude these keys as they are handled by explicit attributes
          !['applicationIdentifier', 'subscriberId'].includes(key)
      )
      .map(([key, value]) => {
        if (typeof value === 'string') {
          return `${key}="${this.escapeForDoubleQuotes(value)}"`;
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
          return `${key}={${value}}`;
        }
        return `${key}={${JSON.stringify(value)}}`;
      });

    return configEntries.length ? `\n      ${configEntries.join('\n      ')}` : '';
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
      `VITE_NOVU_SUBSCRIBER_ID=${this.escapeForDoubleQuotes(subscriberId)}`,
      ...(backendUrl ? [`VITE_NOVU_BACKEND_URL=${this.escapeForDoubleQuotes(backendUrl)}`] : []),
      ...(socketUrl ? [`VITE_NOVU_SOCKET_URL=${this.escapeForDoubleQuotes(socketUrl)}`] : []),
    ];

    return envVars.join('\n');
  }

  getEnvValidationCode(envAccess: string): string {
    return `if (!${envAccess}) {
  console.error('VITE_NOVU_APP_IDENTIFIER environment variable is not set');
  return (
    <div style={{ 
      padding: '1rem',
      margin: '0.5rem',
      border: '1px solid #ff6b6b',
      borderRadius: '0.375rem',
      backgroundColor: '#fff5f5',
      color: '#c92a2a',
      fontSize: '0.875rem'
    }}>
      Configuration Error: VITE_NOVU_APP_IDENTIFIER is not set. Please check your environment variables.
    </div>
  );
}`;
  }
}
