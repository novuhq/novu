import { ENV_ACCESS_PATTERNS } from './environment-config';
import { PROJECT_CREATION_COMMANDS, RUN_COMMANDS } from './framework-commands';

interface FrameworkConfig {
  packageName: string;
  envVarName: string;
  envFileName: string;
  docsUrl: string;
}

interface EnvironmentValidation {
  isValid: boolean;
  missingVars: string[];
}

interface EnvironmentConfig {
  applicationIdentifier?: string;
  subscriberId?: string;
  backendUrl?: string;
  socketUrl?: string;
  isEuRegion: boolean;
}

const FRAMEWORK_CONFIGS: Record<string, FrameworkConfig> = {
  'Next.js': {
    packageName: '@novu/nextjs',
    envVarName: 'NEXT_PUBLIC_NOVU_APP_IDENTIFIER',
    envFileName: '.env.local',
    docsUrl: 'https://docs.novu.co/notification-center/client/nextjs',
  },
  React: {
    packageName: '@novu/react',
    envVarName: 'VITE_NOVU_APP_IDENTIFIER',
    envFileName: '.env',
    docsUrl: 'https://docs.novu.co/notification-center/client/react',
  },
  JavaScript: {
    packageName: '@novu/js',
    envVarName: 'NOVU_APP_IDENTIFIER',
    envFileName: '.env',
    docsUrl: 'https://docs.novu.co/notification-center/client/javascript',
  },
  Angular: {
    packageName: '@novu/angular',
    envVarName: 'NOVU_APP_IDENTIFIER',
    envFileName: 'environment.ts',
    docsUrl: 'https://docs.novu.co/notification-center/client/angular',
  },
  Vue: {
    packageName: '@novu/vue',
    envVarName: 'VITE_NOVU_APP_IDENTIFIER',
    envFileName: '.env',
    docsUrl: 'https://docs.novu.co/notification-center/client/vue',
  },
  Remix: {
    packageName: '@novu/remix',
    envVarName: 'NOVU_APP_IDENTIFIER',
    envFileName: '.env',
    docsUrl: 'https://docs.novu.co/notification-center/client/remix',
  },
  Native: {
    packageName: '@novu/react-native',
    envVarName: 'EXPO_PUBLIC_NOVU_APP_IDENTIFIER',
    envFileName: '.env',
    docsUrl: 'https://docs.novu.co/notification-center/client/react-native',
  },
};

export class FrameworkConfigManager {
  constructor(private readonly framework: string) {
    if (!this.isFrameworkSupported(framework)) {
      throw new Error(`Framework ${framework} is not supported`);
    }
  }

  private isFrameworkSupported(framework: string): boolean {
    return framework in FRAMEWORK_CONFIGS;
  }

  getConfig(): FrameworkConfig {
    return FRAMEWORK_CONFIGS[this.framework];
  }

  getEnvAccessPattern(): string {
    return ENV_ACCESS_PATTERNS[this.framework];
  }

  getProjectCreationCommand(): string | undefined {
    return PROJECT_CREATION_COMMANDS[this.framework];
  }

  getRunCommand(): string | undefined {
    return RUN_COMMANDS[this.framework];
  }

  validateEnvironment(env: EnvironmentConfig): EnvironmentValidation {
    const missingVars: string[] = [];

    if (!env.applicationIdentifier) {
      missingVars.push('applicationIdentifier');
    }

    if (!env.subscriberId) {
      missingVars.push('subscriberId');
    }

    // URLs are optional and will be included in the prompt only if provided

    return {
      isValid: missingVars.length === 0,
      missingVars,
    };
  }

  getFrameworkSpecificInstructions(): string[] {
    const instructions: string[] = [];
    const config = this.getConfig();

    instructions.push(`Use ${config.packageName} package for the integration.`);
    instructions.push(`Configure ${config.envVarName} in your ${config.envFileName} file.`);

    switch (this.framework) {
      case 'Next.js':
        instructions.push('Place the <Inbox /> component in the layout file (typically app/layout.tsx).');
        break;
      case 'React':
        instructions.push('Place the <Inbox /> component inside a NovuInbox wrapper, then mount it in the app layout.');
        break;
      case 'JavaScript':
        instructions.push(
          'Import Novu from @novu/js and initialize with proper configuration.',
          'Use novu.notifications.list() for fetching notifications.',
          'Implement custom UI rendering logic for displaying notifications.',
          'Set up real-time event listeners using novu.on().',
          'Show common notification management methods (read, archive, etc.).',
          'Explain that this is a headless solution for full UI control.'
        );
        break;
      case 'Angular':
        instructions.push('Use ViewChild and ElementRef for DOM element reference.');
        break;
      case 'Vue':
        instructions.push(
          'Use Vue 3 Composition API with <script setup> syntax.',
          'Use ref and onMounted for DOM element reference.'
        );
        break;
      case 'Remix':
        instructions.push('Create a separate NotificationCenter component in app/components/notification-center.tsx.');
        break;
      case 'Native':
        instructions.push('Import and use NovuProvider to wrap your app components.');
        break;
    }

    return instructions;
  }
}

export type { FrameworkConfig, EnvironmentValidation, EnvironmentConfig };
