import type { VerificationSteps } from '../types';

// Common verification steps and consequences
export const COMMON_VERIFICATION = {
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
    'Using outdated SDKs -> runtime errors or broken integration.',
    'Missing workflow creation steps -> no notifications to display.',
    'Not explaining auto-population -> confusion about credential setup.',
    'Missing environment validation -> silent failures and debugging difficulties.',
    'No authentication state handling -> hydration mismatches and runtime errors.',
    'Lack of error handling -> poor user experience and difficult debugging.',
  ],
} satisfies VerificationSteps;
