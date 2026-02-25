import type { EmailStepConfig, NovuConfig } from '../config/schema';

export interface StepWithMetadata {
  workflowId: string;
  stepId: string;
  emailConfig: EmailStepConfig;
}

export interface ConfiguredStep {
  workflowId: string;
  stepId: string;
  config: EmailStepConfig;
}

export function flattenConfigToSteps(config: NovuConfig): StepWithMetadata[] {
  const steps: StepWithMetadata[] = [];

  for (const [workflowId, workflow] of Object.entries(config.workflows)) {
    for (const [stepId, emailConfig] of Object.entries(workflow.steps.email)) {
      steps.push({ workflowId, stepId, emailConfig });
    }
  }

  return steps;
}

export function groupStepsByWorkflow<T extends { workflowId: string }>(steps: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const step of steps) {
    const existing = grouped.get(step.workflowId);
    if (!existing) {
      grouped.set(step.workflowId, [step]);
    } else {
      existing.push(step);
    }
  }

  return grouped;
}

export function buildWorkflowsFromSteps(steps: ConfiguredStep[]): NovuConfig['workflows'] {
  const workflows: NovuConfig['workflows'] = {};

  for (const { workflowId, stepId, config } of steps) {
    if (!workflows[workflowId]) {
      workflows[workflowId] = { steps: { email: {} } };
    }
    workflows[workflowId].steps.email[stepId] = config;
  }

  return workflows;
}
