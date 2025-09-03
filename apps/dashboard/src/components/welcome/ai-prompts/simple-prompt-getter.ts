import { API_HOSTNAME, WEBSOCKET_HOSTNAME } from '../../../config';
import {
  getAngularPromptString,
  getJavaScriptPromptString,
  getNextJsPromptString,
  getReactNativePromptString,
  getReactPromptString,
  getRemixPromptString,
  getVuePromptString,
} from './framework-prompts';

// Define supported frameworks as a type for better type safety
type SupportedFramework = 'Next.js' | 'React' | 'JavaScript' | 'Angular' | 'Vue' | 'Remix' | 'Native';

// Define region configuration type
interface RegionConfig {
  socketUrl: string;
  backendUrl: string;
}

// Define configuration for variable replacement
interface PromptConfig {
  applicationIdentifier: string;
  subscriberId: string;
  backendUrl?: string;
  socketUrl?: string;
}

/**
 * Converts HTTP URLs to WebSocket URLs
 */
function getWebSocketUrl(url: string): string {
  if (!url) return url;
  return url.replace(/^https:\/\//, 'wss://');
}

/**
 * Gets region-specific configuration
 */
function getRegionConfig(region: 'us' | 'eu'): RegionConfig | null {
  if (region === 'eu') {
    return {
      socketUrl: getWebSocketUrl(WEBSOCKET_HOSTNAME),
      backendUrl: API_HOSTNAME,
    };
  }
  return null;
}

/**
 * Gets the appropriate prompt for a given framework with configuration
 */
export function getFrameworkPrompt(
  frameworkName: string,
  applicationIdentifier?: string,
  region: 'us' | 'eu' = 'us',
  subscriberId?: string
): string {
  // Get region configuration
  const regionConfig = getRegionConfig(region);

  // Create base configuration
  const config: PromptConfig = {
    applicationIdentifier: applicationIdentifier ?? 'your_app_identifier',
    subscriberId: subscriberId ?? 'your_subscriber_id',
    ...(regionConfig && {
      backendUrl: regionConfig.backendUrl,
      socketUrl: regionConfig.socketUrl,
    }),
  };

  // Handle framework-specific prompts
  switch (frameworkName as SupportedFramework) {
    case 'Next.js': {
      return getNextJsPromptString(config);
    }

    case 'React': {
      return getReactPromptString(config);
    }

    case 'JavaScript': {
      return getJavaScriptPromptString(config);
    }

    case 'Angular': {
      return getAngularPromptString(config);
    }

    case 'Vue': {
      return getVuePromptString(config);
    }

    case 'Remix': {
      return getRemixPromptString(config);
    }

    case 'Native': {
      return getReactNativePromptString(config);
    }

    default: {
      // Provide a helpful default prompt with configuration information
      return `Help me integrate Novu inbox into my application. I need step-by-step guidance for setup and customization.

Configuration Details:
Application Identifier: ${config.applicationIdentifier}
Subscriber ID: ${config.subscriberId}${
        regionConfig ? `\nBackend URL: ${regionConfig.backendUrl}\nSocket URL: ${regionConfig.socketUrl}` : ''
      }`;
    }
  }
}
