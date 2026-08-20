import { serve } from '@novu/framework/next';
import { novuAgent } from '@/app/novu/agents';
import {
  approveWorkflow,
  askWorkflow,
  chooseWorkflow,
  tellWorkflow,
  usageLimitWorkflow,
  welcomeWorkflow,
} from '@/app/novu/workflows';

export const { GET, POST, OPTIONS } = serve({
  workflows: [welcomeWorkflow, askWorkflow, approveWorkflow, chooseWorkflow, tellWorkflow, usageLimitWorkflow],
  agents: [novuAgent],
});
