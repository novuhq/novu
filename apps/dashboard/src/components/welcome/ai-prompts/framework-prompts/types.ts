/**
 * Configuration interface for prompt generation
 */
export interface PromptConfig {
  applicationIdentifier: string;
  subscriberId: string;
  backendUrl?: string;
  socketUrl?: string;
}

/**
 * Helper function to replace configuration variables in a prompt string
 */
export function replaceConfigVariables(prompt: string, config: PromptConfig): string {
  let result = prompt;

  // Replace application identifier
  result = result.replace(/YOUR_APP(?:LICATION)?_IDENTIFIER/g, () => config.applicationIdentifier);

  // Replace subscriber ID
  result = result.replace(/YOUR_SUBSCRIBER_ID/g, () => config.subscriberId);

  // Replace backend URL if provided
  if (config.backendUrl) {
    result = result.replace(/backendUrl=""/g, `backendUrl="${config.backendUrl}"`);
  }

  // Replace socket URL if provided
  if (config.socketUrl) {
    result = result.replace(/socketUrl=""/g, `socketUrl="${config.socketUrl}"`);
  }

  return result;
}
