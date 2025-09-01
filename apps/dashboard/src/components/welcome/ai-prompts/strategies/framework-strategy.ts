import type { SetupStep, NovuConfig } from '../types';

export interface Environment {
  applicationIdentifier?: string;
  subscriberId?: string;
  backendUrl?: string;
  socketUrl?: string;
  isEuRegion?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  missingVars: string[];
  hasCustomUrls: boolean;
}

export interface FrameworkConfig {
  envVarName: string;
  envFileName: string;
  packageName: string;
  docsUrl: string;
}

export interface FrameworkStrategy {
  readonly config: FrameworkConfig;

  validateEnvironment(env: Environment, requireCredentials?: boolean): ValidationResult;
  generateSetupSteps(env: Environment): SetupStep[];
  getConfigTemplate(config: NovuConfig): string;
  getEnvSetupCode(env: Environment): string;
  getEnvValidationCode(envAccess: string): string;
}

export abstract class BaseFrameworkStrategy implements FrameworkStrategy {
  constructor(readonly config: FrameworkConfig) {}

  abstract validateEnvironment(env: Environment, requireCredentials?: boolean): ValidationResult;
  abstract generateSetupSteps(env: Environment): SetupStep[];
  abstract getConfigTemplate(config: NovuConfig): string;
  abstract getEnvSetupCode(env: Environment): string;
  abstract getEnvValidationCode(envAccess: string): string;

  protected validateRequiredVars(env: Environment, requireCredentials: boolean = false): ValidationResult {
    const missingVars: string[] = [];
    const hasCustomUrls = !!(env.backendUrl || env.socketUrl);

    // Only check for credentials if explicitly required
    if (requireCredentials) {
      if (!env.applicationIdentifier) {
        missingVars.push('applicationIdentifier');
      }
      if (!env.subscriberId) {
        missingVars.push('subscriberId');
      }
    }

    // Only check for URLs if in EU region
    if (env.isEuRegion) {
      if (!env.backendUrl) {
        missingVars.push('backendUrl');
      }
      if (!env.socketUrl) {
        missingVars.push('socketUrl');
      }
    }

    return {
      isValid: missingVars.length === 0,
      missingVars,
      hasCustomUrls,
    };
  }

  protected escapeString(str: string | undefined, quote: '"' | "'" = '"'): string {
    if (!str) return '';
    return str.replace(/\\/g, '\\\\').replace(new RegExp(quote, 'g'), `\\${quote}`);
  }

  // Keep for backward compatibility
  protected escapeForDoubleQuotes(str: string | undefined): string {
    return this.escapeString(str, '"');
  }

  protected escapeForSingleQuotes(str: string | undefined): string {
    return this.escapeString(str, "'");
  }
}
