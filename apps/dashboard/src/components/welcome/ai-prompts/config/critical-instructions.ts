import { CriticalInstructions } from '../types/framework';

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
    'Do not expose secrets (API keys, tokens, credentials) or include real secret values - always use descriptive placeholders like NOVU_API_KEY or process.env.YOUR_SECRET_NAME.',
  ],
};
