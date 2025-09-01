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
  always: readonly string[];
  never: readonly string[];
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
