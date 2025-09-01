import {
  ANGULAR_PROMPT,
  JAVASCRIPT_PROMPT,
  NEXTJS_PROMPT,
  REACT_NATIVE_PROMPT,
  REACT_PROMPT,
  REMIX_PROMPT,
  VUE_PROMPT,
} from './framework-prompts';

export function getFrameworkPrompt(frameworkName: string): string {
  switch (frameworkName) {
    case 'Next.js':
      return NEXTJS_PROMPT;
    case 'React':
      return REACT_PROMPT;
    case 'JavaScript':
      return JAVASCRIPT_PROMPT;
    case 'Angular':
      return ANGULAR_PROMPT;
    case 'Vue':
      return VUE_PROMPT;
    case 'Remix':
      return REMIX_PROMPT;
    case 'Native':
      return REACT_NATIVE_PROMPT;
    default:
      return 'Help me integrate Novu inbox into my application. I need step-by-step guidance for setup and customization.';
  }
}
