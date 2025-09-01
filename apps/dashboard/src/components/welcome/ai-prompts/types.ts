export interface VerificationSteps {
  steps: string[];
  consequences: string[];
}

export interface SetupStep {
  title: string;
  code?: string;
  description?: string;
  notes?: string[];
}

export interface NovuConfig {
  backendUrl?: string;
  socketUrl?: string;
  applicationIdentifier?: string;
  subscriberId?: string;
}
