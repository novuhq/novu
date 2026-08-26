import { serve } from '@novu/framework/next';
import { langchainVisionAgent } from '@/app/novu/langchain-vision';
import { welcomeWorkflow } from '@/app/novu/workflows';

export const { GET, POST, OPTIONS } = serve({ workflows: [welcomeWorkflow], agents: [langchainVisionAgent] });
