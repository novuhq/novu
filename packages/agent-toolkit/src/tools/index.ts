import { triggerWorkflow } from './trigger-workflow.js';
import { updatePreferences } from './preferences.js';

export { triggerWorkflow } from './trigger-workflow.js';
export { updatePreferences } from './preferences.js';
export { createWorkflowTools } from './workflows-as-tools.js';

export const builtInTools = [triggerWorkflow, updatePreferences] as const;
