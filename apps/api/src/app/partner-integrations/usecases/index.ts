import { CreateVercelIntegration } from './create-vercel-integration/create-vercel-integration.usecase';
import { GetVercelIntegration } from './get-vercel-integration/get-vercel-integration.usecase';
import { GetVercelIntegrationProjects } from './get-vercel-projects/get-vercel-integration-projects.usecase';
import { ProcessVercelWebhook } from './process-vercel-webhook/process-vercel-webhook.usecase';
import { SyncAgentsFromBridge } from './sync-agents-from-bridge/sync-agents-from-bridge.usecase';
import { UpdateVercelIntegration } from './update-vercel-integration/update-vercel-integration.usecase';

export const USE_CASES = [
  CreateVercelIntegration,
  GetVercelIntegrationProjects,
  GetVercelIntegration,
  UpdateVercelIntegration,
  ProcessVercelWebhook,
  SyncAgentsFromBridge,
];
