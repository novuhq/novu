export type EmailStepConfig = {
  template: string;
  subject?: string;
};

export type NovuConfig = {
  outDir?: string;
  workflows: {
    [workflowId: string]: {
      steps: {
        email: Record<string, EmailStepConfig>;
      };
    };
  };
  apiUrl?: string;
  aliases?: Record<string, string>;
};

export function validateConfig(config: unknown): NovuConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid config: must be an object');
  }

  const novuConfig = config as Partial<NovuConfig>;

  if (!novuConfig.workflows || typeof novuConfig.workflows !== 'object') {
    throw new Error('Invalid config: workflows field is required and must be an object');
  }

  const errors: string[] = [];

  for (const [workflowId, workflow] of Object.entries(novuConfig.workflows)) {
    if (!workflow || typeof workflow !== 'object') {
      errors.push(`workflows['${workflowId}'] must be an object`);
      continue;
    }

    if (!workflow.steps || typeof workflow.steps !== 'object') {
      errors.push(`workflows['${workflowId}'].steps is required and must be an object`);
      continue;
    }

    if (!workflow.steps.email || typeof workflow.steps.email !== 'object') {
      errors.push(`workflows['${workflowId}'].steps.email is required and must be an object`);
      continue;
    }

    const stepIds = new Set<string>();

    for (const [stepId, emailConfig] of Object.entries(workflow.steps.email)) {
      if (stepIds.has(stepId)) {
        errors.push(`Duplicate step ID '${stepId}' in workflow '${workflowId}'`);
      }
      stepIds.add(stepId);

      if (!emailConfig.template || typeof emailConfig.template !== 'string') {
        errors.push(`workflows['${workflowId}'].steps.email['${stepId}'].template is required and must be a string`);
      }

      if (emailConfig.subject !== undefined && typeof emailConfig.subject !== 'string') {
        errors.push(`workflows['${workflowId}'].steps.email['${stepId}'].subject must be a string`);
      }
    }
  }

  if (novuConfig.outDir !== undefined && typeof novuConfig.outDir !== 'string') {
    errors.push('outDir must be a string');
  }

  if (novuConfig.apiUrl !== undefined && typeof novuConfig.apiUrl !== 'string') {
    errors.push('apiUrl must be a string');
  }

  if (novuConfig.aliases !== undefined) {
    if (typeof novuConfig.aliases !== 'object' || novuConfig.aliases === null) {
      errors.push('aliases must be an object');
    } else {
      for (const [alias, target] of Object.entries(novuConfig.aliases)) {
        if (typeof target !== 'string') {
          errors.push(`aliases['${alias}'] must be a string`);
          continue;
        }

        if (target.trim().length === 0) {
          errors.push(`aliases['${alias}'] cannot be empty`);
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation errors:\n  • ${errors.join('\n  • ')}`);
  }

  return novuConfig as NovuConfig;
}
