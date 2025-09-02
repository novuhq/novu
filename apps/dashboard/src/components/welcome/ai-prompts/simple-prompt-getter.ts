import {
  ANGULAR_PROMPT,
  JAVASCRIPT_PROMPT,
  NEXTJS_PROMPT,
  REACT_NATIVE_PROMPT,
  REACT_PROMPT,
  REMIX_PROMPT,
  VUE_PROMPT,
} from './framework-prompts';

export function getFrameworkPrompt(
  frameworkName: string,
  applicationIdentifier?: string,
  region: 'us' | 'eu' = 'us'
): string {
  const regionConfig = {
    eu: {
      socketUrl: 'wss://eu.ws.novu.co',
      backendUrl: 'https://eu.api.novu.co',
    },
  };

  const urlConfig = region === 'eu' ? regionConfig.eu : null;
  switch (frameworkName) {
    case 'Next.js':
      return NEXTJS_PROMPT.replace(
        /NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER=/g,
        `NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER=${applicationIdentifier || 'YOUR_APPLICATION_IDENTIFIER'}`
      );
    case 'React':
      return REACT_PROMPT.replace(
        /VITE_NOVU_APP_IDENTIFIER=your_app_identifier/g,
        `VITE_NOVU_APP_IDENTIFIER=${applicationIdentifier || 'your_app_identifier'}`
      );
    case 'JavaScript':
      return `${JAVASCRIPT_PROMPT}\n\nApplication Identifier: ${applicationIdentifier || 'Not provided'}${urlConfig ? `\nBackend URL: ${urlConfig.backendUrl}\nSocket URL: ${urlConfig.socketUrl}` : ''}`;
    case 'Angular':
      return ANGULAR_PROMPT.replace(
        /novuAppIdentifier: 'your_app_identifier'/g,
        `novuAppIdentifier: '${applicationIdentifier || 'your_app_identifier'}'`
      );
    case 'Vue':
      return VUE_PROMPT.replace(
        /VITE_NOVU_APP_IDENTIFIER=your_app_identifier/g,
        `VITE_NOVU_APP_IDENTIFIER=${applicationIdentifier || 'your_app_identifier'}`
      );
    case 'Remix':
      return REMIX_PROMPT.replace(
        /NOVU_APP_IDENTIFIER=your_app_identifier/g,
        `NOVU_APP_IDENTIFIER=${applicationIdentifier || 'your_app_identifier'}`
      );
    case 'Native':
      return REACT_NATIVE_PROMPT.replace(
        /NOVU_APP_IDENTIFIER=your_app_identifier/g,
        `NOVU_APP_IDENTIFIER=${applicationIdentifier || 'your_app_identifier'}`
      );
    default:
      return `Help me integrate Novu inbox into my application. I need step-by-step guidance for setup and customization.\n\nApplication Identifier: ${applicationIdentifier || 'Not provided'}${urlConfig ? `\nBackend URL: ${urlConfig.backendUrl}\nSocket URL: ${urlConfig.socketUrl}` : ''}`;
  }
}
