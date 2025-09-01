import { generateNextjsSection } from './nextjs-section';

export function generateFrameworkSpecificSection(framework: string): string[] {
  switch (framework) {
    case 'Next.js':
      return generateNextjsSection();
    default:
      return [];
  }
}
