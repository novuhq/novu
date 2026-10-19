import { serve } from '@novu/framework/next';
import { aiSdkAgent } from '@/app/novu/agents/ai-sdk-agent';
import { customCodeAgent } from '@/app/novu/agents/custom-code-agent';
import { langchainAgent } from '@/app/novu/agents/langchain-agent';
import {
  allChannelsWorkflow,
  delayCustomWorkflow,
  digestWorkflow,
  throttleWorkflow,
  welcomeWorkflow,
} from '@/app/novu/workflows';

export const { GET, POST, OPTIONS } = serve({
  workflows: [welcomeWorkflow, allChannelsWorkflow, delayCustomWorkflow, digestWorkflow, throttleWorkflow],
  agents: [customCodeAgent, aiSdkAgent, langchainAgent],
});
