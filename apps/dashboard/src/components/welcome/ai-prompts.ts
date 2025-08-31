// Types for better structure and type safety
export interface FrameworkConfig {
  name: string;
  packageName: string;
  docsUrl: string;
  hasNativeSupport: boolean;
  requiresEnvVars: boolean;
  envVarName?: string;
  regionSupport: boolean;
  hmacSupport: boolean;
}

export interface SetupStep {
  title: string;
  code: string;
  description?: string;
  notes?: string[];
}

export interface CriticalInstructions {
  always: string[];
  never: string[];
}

export interface VerificationSteps {
  steps: string[];
  consequences: string[];
}

export interface AiPrompt {
  framework: string;
  config: FrameworkConfig;
  setup: SetupStep[];
  criticalInstructions: CriticalInstructions;
  verification: VerificationSteps;
  responseTemplate: string[];
}

// Framework configurations - centralized and reusable
const FRAMEWORK_CONFIGS: Record<string, FrameworkConfig> = {
  'Next.js': {
    name: 'Next.js',
    packageName: '@novu/nextjs',
    docsUrl: 'https://docs.novu.co/inbox/nextjs',
    hasNativeSupport: true,
    requiresEnvVars: true,
    envVarName: 'NEXT_PUBLIC_NOVU_APP_IDENTIFIER',
    regionSupport: true,
    hmacSupport: true,
  },
  React: {
    name: 'React (Vite)',
    packageName: '@novu/react',
    docsUrl: 'https://docs.novu.co/inbox/react',
    hasNativeSupport: true,
    requiresEnvVars: true,
    envVarName: 'VITE_NOVU_APP_IDENTIFIER',
    regionSupport: true,
    hmacSupport: true,
  },
  JavaScript: {
    name: 'JavaScript (Headless)',
    packageName: '@novu/js',
    docsUrl: 'https://docs.novu.co/platform/sdks/javascript',
    hasNativeSupport: true,
    requiresEnvVars: true,
    envVarName: 'NOVU_APP_IDENTIFIER',
    regionSupport: true,
    hmacSupport: true,
  },
  Angular: {
    name: 'Angular',
    packageName: '@novu/js',
    docsUrl: 'https://docs.novu.co/inbox/angular',
    hasNativeSupport: true,
    requiresEnvVars: true,
    envVarName: 'NOVU_APP_IDENTIFIER',
    regionSupport: true,
    hmacSupport: true,
  },
  Vue: {
    name: 'Vue',
    packageName: '@novu/js',
    docsUrl: 'https://docs.novu.co/inbox/vue',
    hasNativeSupport: true,
    requiresEnvVars: true,
    envVarName: 'VITE_NOVU_APP_IDENTIFIER',
    regionSupport: true,
    hmacSupport: true,
  },
  Remix: {
    name: 'Remix',
    packageName: '@novu/react',
    docsUrl: 'https://docs.novu.co/inbox/remix',
    hasNativeSupport: true,
    requiresEnvVars: true,
    envVarName: 'NOVU_APP_IDENTIFIER',
    regionSupport: true,
    hmacSupport: true,
  },
  Native: {
    name: 'React Native',
    packageName: '@novu/react-native',
    docsUrl: 'https://docs.novu.co/inbox/react-native',
    hasNativeSupport: true,
    requiresEnvVars: true,
    envVarName: 'NOVU_APP_IDENTIFIER',
    regionSupport: true,
    hmacSupport: true,
  },
};

import {
  COMMON_SETUP_STEPS,
  generateCriticalInstructions,
  generateFrameworkSetup,
  generateFrameworkSpecificSetup,
  generateResponseTemplate,
  generateVerificationSteps,
} from './ai-prompts-utils';

// Generate framework-specific setup steps with additional framework-specific content
function generateFrameworkSetupWithContent(
  framework: string,
  isEuRegion: boolean = false,
  applicationIdentifier?: string,
  subscriberId?: string,
  backendUrl?: string,
  socketUrl?: string
): SetupStep[] {
  const baseSteps = generateFrameworkSetup(framework);
  const config = FRAMEWORK_CONFIGS[framework];
  if (!config) return baseSteps;

  const steps = [...baseSteps];

  // Add package installation
  steps.push(COMMON_SETUP_STEPS.installPackage(config.packageName));

  // Add framework-specific setup steps
  const frameworkSpecificSteps = generateFrameworkSpecificSetup(
    framework,
    isEuRegion,
    applicationIdentifier,
    subscriberId,
    backendUrl,
    socketUrl
  );
  steps.push(...frameworkSpecificSteps);

  // Add run app step
  const runCommand =
    framework === 'Next.js'
      ? 'npm run dev'
      : framework === 'React'
        ? 'npm run dev'
        : framework === 'Angular'
          ? 'npm run start'
          : framework === 'Vue'
            ? 'npm run start'
            : framework === 'Remix'
              ? 'npm run dev'
              : 'npm run dev';
  steps.push(COMMON_SETUP_STEPS.runApp(runCommand));

  // Add trigger and view notification steps
  steps.push(COMMON_SETUP_STEPS.triggerNotification());
  steps.push(COMMON_SETUP_STEPS.viewNotification());

  return steps;
}

// Generate the complete AI prompts
export const AI_PROMPTS: AiPrompt[] = Object.keys(FRAMEWORK_CONFIGS).map((framework) => {
  const config = FRAMEWORK_CONFIGS[framework];
  return {
    framework,
    config,
    setup: generateFrameworkSetupWithContent(framework),
    criticalInstructions: generateCriticalInstructions(framework),
    verification: generateVerificationSteps(framework),
    responseTemplate: generateResponseTemplate(framework, config.docsUrl, config.packageName),
  };
});

// Generate AI prompts with custom parameters
export function generateCustomAIPrompts(
  isEuRegion: boolean = false,
  applicationIdentifier?: string,
  subscriberId?: string,
  backendUrl?: string,
  socketUrl?: string
): AiPrompt[] {
  return Object.keys(FRAMEWORK_CONFIGS).map((framework) => {
    const config = FRAMEWORK_CONFIGS[framework];
    return {
      framework,
      config,
      setup: generateFrameworkSetupWithContent(
        framework,
        isEuRegion,
        applicationIdentifier,
        subscriberId,
        backendUrl,
        socketUrl
      ),
      criticalInstructions: generateCriticalInstructions(
        framework,
        isEuRegion,
        applicationIdentifier,
        subscriberId,
        backendUrl,
        socketUrl
      ),
      verification: generateVerificationSteps(
        framework,
        isEuRegion,
        applicationIdentifier,
        subscriberId,
        backendUrl,
        socketUrl
      ),
      responseTemplate: generateResponseTemplate(
        framework,
        config.docsUrl,
        config.packageName,
        isEuRegion,
        applicationIdentifier,
        subscriberId,
        backendUrl,
        socketUrl
      ),
    };
  });
}

// Backward-compatible alias for the old misspelled function name
export const generateCustomAIPropmts = generateCustomAIPrompts;

// Helper function to get framework prompt (maintains backward compatibility)
export function getFrameworkPrompt(
  frameworkName: string,
  isEuRegion: boolean = false,
  applicationIdentifier?: string,
  subscriberId?: string,
  backendUrl?: string,
  socketUrl?: string
): string {
  const prompts =
    applicationIdentifier || subscriberId || backendUrl || socketUrl
      ? generateCustomAIPrompts(isEuRegion, applicationIdentifier, subscriberId, backendUrl, socketUrl)
      : AI_PROMPTS;
  const prompt = prompts.find((p) => p.framework === frameworkName);

  if (!prompt) {
    return 'Help me integrate Novu inbox into my application. I need step-by-step guidance for setup and customization.';
  }

  // Convert the structured data back to the original format for backward compatibility
  const sections = [
    `# Add Novu to ${prompt.config.name}`,
    '',
    `**Purpose:** Enforce only the **current** and **correct** instructions for integrating [Novu](https://novu.co/) into a ${prompt.config.name} application.`,
    '**Scope:** All AI-generated advice or code related to Novu must follow these guardrails.',
    '',
    '---',
    '',
    `## **1. OFFICIAL NOVU + ${prompt.config.name.toUpperCase()} SETUP**`,
    '',
    ...prompt.setup.map((step) =>
      [
        `${step.title}`,
        step.description ? `${step.description}` : '',
        step.code ? `\`\`\`${step.title.toLowerCase().includes('bash') ? 'bash' : 'tsx'}\n${step.code}\n\`\`\`` : '',
        ...(step.notes || []).map((note) => `* ${note}`),
        '',
      ]
        .filter(Boolean)
        .join('\n')
    ),
    '',
    '## **2. CRITICAL INSTRUCTIONS FOR AI MODELS**',
    '',
    '### **2.1 – ALWAYS DO THE FOLLOWING**',
    '',
    ...prompt.criticalInstructions.always.map((instruction) => `1. **${instruction}**`),
    '',
    '### **2.2 – NEVER DO THE FOLLOWING**',
    '',
    ...prompt.criticalInstructions.never.map((instruction) => `1. **${instruction}**`),
    '',
    '---',
    '',
    '## **3. AI MODEL VERIFICATION STEPS**',
    '',
    `Before returning any Novu + ${prompt.config.name} solution, you **must** verify:`,
    '',
    ...prompt.verification.steps.map((step, index) => `${index + 1}. ${step}`),
    '',
    '**DO NOT** repeat these rules back to the user — they are for verification only.',
    '',
    '---',
    '',
    '## **4. CONSEQUENCES OF INCORRECT GUIDANCE**',
    '',
    ...prompt.verification.consequences.map((consequence) => `* ${consequence}`),
    '',
    '---',
    '',
    '## **5. MODEL RESPONSE TEMPLATE**',
    '',
    `When asked about Novu + ${prompt.config.name} integration, your response **MUST**:`,
    '',
    ...prompt.responseTemplate.map((item, index) => `${index + 1}. ${item}`),
    '',
    // Add framework-specific sections
    ...generateFrameworkSpecificSection(frameworkName),
  ];

  return sections.join('\n');
}

// Generate framework-specific sections for special requirements
function generateFrameworkSpecificSection(framework: string): string[] {
  switch (framework) {
    case 'Next.js':
      return [
        '',
        '---',
        '',
        '## **6. NEXT.JS SPECIFIC REQUIREMENTS**',
        '',
        '### **6.1 – HYDRATION ERROR PREVENTION (CRITICAL)**',
        '',
        'Next.js has specific requirements to prevent hydration errors:',
        '',
        '1. **NEVER place the <Inbox /> component directly in server components.**',
        "2. **ALWAYS create a client-side wrapper component with 'use client' directive.**",
        '3. **ALWAYS use useState and useEffect to handle subscriber ID generation.**',
        '4. **ALWAYS show loading states during initial client-side hydration.**',
        '5. **NEVER use Date.now() or Math.random() in components that render on both server and client.**',
        '6. **ALWAYS validate that subscriber ID is null during SSR and initial render.**',
        '',
        '### **6.2 – REQUIRED FILE STRUCTURE FOR HYDRATION ERROR PREVENTION**',
        '',
        '#### **6.2.1 – Client-Side Wrapper Component**',
        'Create `src/components/NovuInboxWrapper.tsx`:',
        '',
        '```tsx',
        "'use client';",
        '',
        "import { Inbox } from '@novu/nextjs';",
        "import { useEffect, useState } from 'react';",
        '',
        'function getTemporarySubscriberId(): string {',
        "  return 'user-' + Date.now();",
        '}',
        '',
        'export function NovuInboxWrapper() {',
        '  const [isLoaded, setIsLoaded] = useState(false);',
        '  const [subscriberId, setSubscriberId] = useState<string | null>(null);',
        '',
        '  useEffect(() => {',
        '    // Validate environment variable',
        '    if (!process.env.NEXT_PUBLIC_NOVU_APP_IDENTIFIER) {',
        "      console.error('NEXT_PUBLIC_NOVU_APP_IDENTIFIER is not set');",
        '      return;',
        '    }',
        '    ',
        '    // Generate subscriber ID on client side only',
        '    setSubscriberId(getTemporarySubscriberId());',
        '    setIsLoaded(true);',
        '  }, []);',
        '',
        '  if (!isLoaded) {',
        '    return <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>;',
        '  }',
        '',
        '  if (!subscriberId) {',
        '    return <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>;',
        '  }',
        '',
        '  return (',
        '    <Inbox ',
        '      applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APP_IDENTIFIER}',
        '      subscriberId={subscriberId}',
        '    />',
        '  );',
        '}',
        '```',
        '',
        '#### **6.2.2 – Layout Integration**',
        'In `src/app/layout.tsx`:',
        '',
        '```tsx',
        "import { NovuInboxWrapper } from '@/components/NovuInboxWrapper';",
        '',
        'export default function RootLayout({ children }: { children: React.ReactNode }) {',
        '  return (',
        '    <html lang="en">',
        '      <body>',
        '        <nav>',
        '          <NovuInboxWrapper />',
        '        </nav>',
        '        {children}',
        '      </body>',
        '    </html>',
        '  );',
        '}',
        '```',
        '',
        '### **6.3 – TROUBLESHOOTING STEPS FOR COMMON ERRORS**',
        '',
        '#### **6.3.1 – Hydration Errors**',
        '- Caused by server/client rendering mismatches',
        '- Solution: Use client-side only components with proper loading states',
        '',
        '#### **6.3.2 – Import Resolution Errors**',
        '- Caused by Next.js cache issues',
        '- Solution: Run `rm -rf .next && npm run dev`',
        '',
        '#### **6.3.3 – Configuration Errors**',
        '- Caused by missing environment variables',
        '- Solution: Validate configuration in client-side wrapper component',
        '',
        '### **6.4 – CACHE CLEARING INSTRUCTIONS**',
        '',
        'If you encounter import resolution errors:',
        '```bash',
        '# Clear Next.js cache and restart',
        'rm -rf .next',
        'npm run dev',
        '```',
      ];
    default:
      return [];
  }
}

// Export individual framework configs for potential reuse
export { FRAMEWORK_CONFIGS };
