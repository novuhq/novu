export interface DiscoveredStep {
  stepId: string;
  workflowId: string;
  type: string;
  filePath: string;
  relativePath: string;
}

export interface ValidationError {
  filePath: string;
  errors: string[];
}

export interface StepDiscoveryResult {
  valid: boolean;
  matchedFiles: number;
  steps: DiscoveredStep[];
  errors: ValidationError[];
}

export interface StepResolverReleaseBundle {
  code: string;
  size: number;
}

export interface StepResolverManifestStep {
  workflowId: string;
  stepId: string;
}

export interface DeploymentResult {
  stepResolverHash: string;
  workerId: string;
  selectedStepsCount: number;
  deployedAt: string;
}

export interface EnvironmentInfo {
  _id: string;
  name: string;
  _organizationId: string;
  type: 'prod' | 'dev';
}
