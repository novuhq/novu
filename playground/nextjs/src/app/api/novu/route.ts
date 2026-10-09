import { serve } from '@novu/framework/next';
import { humanHitlAgent } from '@/app/novu/agents';
import { langchainVisionAgent } from '@/app/novu/langchain-vision';
import { aiSdkRuntimeAgent, customCodeAgent, langchainRuntimeAgent } from '@/app/novu/runtime-agents';
import {
  allChannelsWorkflow,
  delayCustomWorkflow,
  digestWorkflow,
  throttleWorkflow,
  welcomeWorkflow,
} from '@/app/novu/workflows';

export const { GET, POST, OPTIONS } = serve({
  workflows: [welcomeWorkflow, allChannelsWorkflow, delayCustomWorkflow, digestWorkflow, throttleWorkflow],
  agents: [langchainVisionAgent, humanHitlAgent, customCodeAgent, aiSdkRuntimeAgent, langchainRuntimeAgent],
});
