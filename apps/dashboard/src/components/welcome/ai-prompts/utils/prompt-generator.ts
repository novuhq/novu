import {
  generateCriticalInstructions,
  generateFrameworkSpecificSetup,
  generateResponseTemplate,
  generateVerificationSteps,
} from '../ai-prompts-utils';
import { FRAMEWORK_CONFIGS } from '../config/framework-configs';
import { generateFrameworkSpecificSection } from '../framework-sections';
import { COMMON_SETUP_STEPS, generateFrameworkSetup } from '../setup/common-setup-steps';
import { AiPrompt, SetupStep } from '../types/framework';

function generateFrameworkSetupWithContent(
  framework: string,
  isEuRegion: boolean = false,
  applicationIdentifier?: string,
  subscriberId?: string,
  backendUrl?: string,
  socketUrl?: string,
  codeSnippet?: string
): SetupStep[] {
  const baseSteps = generateFrameworkSetup({ framework });
  const config = FRAMEWORK_CONFIGS[framework];
  if (!config) return baseSteps;

  const steps = [...baseSteps];

  steps.push(COMMON_SETUP_STEPS.installPackage(config.packageName));

  const frameworkSpecificSteps = generateFrameworkSpecificSetup(
    framework,
    isEuRegion,
    applicationIdentifier,
    subscriberId,
    backendUrl,
    socketUrl,
    codeSnippet
  );
  steps.push(...frameworkSpecificSteps);

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

  steps.push(COMMON_SETUP_STEPS.triggerNotification());
  steps.push(COMMON_SETUP_STEPS.viewNotification());

  return steps;
}

export function generateCustomAIPrompts(
  isEuRegion: boolean = false,
  applicationIdentifier?: string,
  subscriberId?: string,
  backendUrl?: string,
  socketUrl?: string,
  codeSnippet?: string
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
        socketUrl,
        codeSnippet
      ),
      criticalInstructions: generateCriticalInstructions(
        framework,
        isEuRegion,
        applicationIdentifier,
        subscriberId,
        backendUrl,
        socketUrl
      ),
      verification: generateVerificationSteps({
        framework,
        isEuRegion,
        applicationIdentifier,
        subscriberId,
        backendUrl,
        socketUrl,
      }),
      responseTemplate: generateResponseTemplate({
        framework,
        isEuRegion,
        applicationIdentifier,
        subscriberId,
        backendUrl,
        socketUrl,
      }),
    };
  });
}

export function getFrameworkPrompt(
  frameworkName: string,
  isEuRegion: boolean = false,
  applicationIdentifier?: string,
  subscriberId?: string,
  backendUrl?: string,
  socketUrl?: string,
  codeSnippet?: string
): string {
  const prompts = generateCustomAIPrompts(
    isEuRegion,
    applicationIdentifier,
    subscriberId,
    backendUrl,
    socketUrl,
    codeSnippet
  );
  const prompt = prompts.find((p) => p.framework === frameworkName);

  if (!prompt) {
    return 'Help me integrate Novu inbox into my application. I need step-by-step guidance for setup and customization.';
  }

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
    ...generateFrameworkSpecificSection(frameworkName),
  ];

  return sections.join('\n');
}
