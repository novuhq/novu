const ID_REGEX = /^[a-z0-9-]+$/;
const MAX_LENGTH = 50;

export function validateWorkflowId(value: string): string | true {
  if (!value) {
    return 'Workflow ID is required';
  }

  if (!ID_REGEX.test(value)) {
    return 'Use lowercase, numbers, and hyphens only (e.g., "my-workflow")';
  }

  if (value.length > MAX_LENGTH) {
    return `Maximum ${MAX_LENGTH} characters`;
  }

  return true;
}

export function validateStepId(value: string, existingStepIds: Set<string> = new Set()): string | true {
  if (!value) {
    return 'Step ID is required';
  }

  if (!ID_REGEX.test(value)) {
    return 'Use lowercase, numbers, and hyphens only (e.g., "welcome-email")';
  }

  if (value.length > MAX_LENGTH) {
    return `Maximum ${MAX_LENGTH} characters`;
  }

  if (existingStepIds.has(value)) {
    return `Step ID "${value}" already exists`;
  }

  return true;
}

export function generateStepIdFromFilename(filename: string): string {
  return filename
    .replace(/\.(tsx?|jsx?)$/, '')
    .replace(/([A-Z])/g, '-$1')
    .replace(/[_\s]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export function generateWorkflowIdFromStepId(stepId: string): string {
  if (stepId.endsWith('-email')) {
    return stepId.slice(0, -6);
  }

  return stepId;
}
