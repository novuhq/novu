import type { NovuConfig, SetupStep } from '../types';
import { BaseFrameworkStrategy, Environment } from './framework-strategy';

export class AngularStrategy extends BaseFrameworkStrategy {
  constructor() {
    super({
      envVarName: 'novuAppIdentifier',
      envFileName: 'environment.ts',
      packageName: '@novu/js',
      docsUrl: 'https://docs.novu.co/platform/inbox/angular',
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
        'Angular uses environment.ts for configuration instead of .env files.',
      ],
    });

    // Add component implementation step
    steps.push({
      title: 'Add the notification Inbox to your app',
      description: 'Currently, Angular applications are supported with the Novu UI library.',
      code: `import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { NovuUI } from '@novu/js/ui';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements AfterViewInit {
  @ViewChild('notificationInbox') notificationInbox!: ElementRef<HTMLElement>;
  title = 'inbox-angular';

  ngAfterViewInit() {
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

    novu.mountComponent({
      name: 'Inbox',
      props: {},
      element: this.notificationInbox.nativeElement,
    });
  }
}`,
      notes: [
        'The ViewChild and ElementRef are used to get a reference to the DOM element.',
        'The NovuUI class is used to mount the Inbox component.',
        'For production: Replace with dynamic ID from your authentication solution.',
        'Common patterns: this.authService.getCurrentUserId(), this.user?.id, etc.',
        "Note: subscriberId comes from your app's authentication, not from the Novu dashboard.",
        'Region configuration is automatically included for EU users only.',
        'Make sure to add <div #notificationInbox></div> in your template.',
      ],
    });

    return steps;
  }

  getConfigTemplate(config: NovuConfig): string {
    const configEntries = Object.entries(config)
      .filter(([_, value]) => value !== undefined && value !== '')
      .map(([key, value]: [string, string | undefined]) => `,\n        ${key}: '${this.escapeForSingleQuotes(value)}'`);

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

    const config = [
      'export const environment = {',
      '  production: false,',
      `  novuAppIdentifier: '${this.escapeForDoubleQuotes(applicationIdentifier)}',`,
      `  novuSubscriberId: '${this.escapeForDoubleQuotes(subscriberId)}'`,
      ...(backendUrl ? [`,  novuBackendUrl: '${this.escapeForDoubleQuotes(backendUrl)}'`] : []),
      ...(socketUrl ? [`,  novuSocketUrl: '${this.escapeForDoubleQuotes(socketUrl)}'`] : []),
      '};',
    ];

    return config.join('\n');
  }

  getEnvValidationCode(envAccess: string): string {
    return `if (!${envAccess}) {
  console.error('novuAppIdentifier is not set in environment');
  return null;
}`;
  }
}
