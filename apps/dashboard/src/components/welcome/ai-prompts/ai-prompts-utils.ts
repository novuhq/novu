import { COMMON_CRITICAL_INSTRUCTIONS } from './config/critical-instructions';
import { FrameworkConfigManager } from './config/framework-config-manager';
import { generateFrameworkSetup } from './setup/common-setup-steps';
import { getEffectiveUrls } from './strategies/url-utils';
import type { CriticalInstructions, SetupStep, VerificationSteps } from './types/framework';

// Re-export common types and interfaces
export type { CriticalInstructions, SetupStep, VerificationSteps };

// Function to generate framework-specific setup steps
export function generateFrameworkSpecificSetup(
  framework: string,
  isEuRegion: boolean = false,
  applicationIdentifier?: string,
  subscriberId?: string,
  backendUrl?: string,
  socketUrl?: string,
  codeSnippet?: string
): SetupStep[] {
  return generateFrameworkSetup({
    framework,
    isEuRegion,
    applicationIdentifier,
    subscriberId,
    backendUrl,
    socketUrl,
    codeSnippet,
  });
}

// Function to generate critical instructions
export function generateCriticalInstructions(
  framework: string,
  isEuRegion: boolean = false,
  applicationIdentifier?: string,
  subscriberId?: string,
  backendUrl?: string,
  socketUrl?: string
): CriticalInstructions {
  const { effectiveBackendUrl, effectiveSocketUrl } = getEffectiveUrls(backendUrl, socketUrl);
  const configManager = new FrameworkConfigManager(framework);

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
      `Missing required environment variables: ${validation.missingVars.join(', ')}. Please provide all required values before generating critical instructions.`
    );
  }

  const always = [...COMMON_CRITICAL_INSTRUCTIONS.always];
  const never = [...COMMON_CRITICAL_INSTRUCTIONS.never];

  // Add URL configuration instructions if custom URLs are provided
  if (effectiveBackendUrl || effectiveSocketUrl) {
    always.push('Configure custom backend and socket URLs.');
  }

  // Add framework-specific instructions
  const frameworkInstructions = configManager.getFrameworkSpecificInstructions();
  always.push(...frameworkInstructions);

  return { always, never };
}

// Re-export response template generator
export { generateResponseTemplate } from './templates/response-template-generator';

// Re-export troubleshooting section generator
export { generateTroubleshootingSection } from './troubleshooting/troubleshooting-generator';
// Re-export verification steps generator
export { generateVerificationSteps } from './verification/verification-generator';
