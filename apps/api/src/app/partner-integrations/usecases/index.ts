import { UpdateVercelConfiguration } from './update-vercel-configuration/update-vercel-configuration.usecase';
import { GetVercelConfiguration } from './get-vercel-configuration/get-vercel-configuration.usecase';
import { CompleteVercelIntegration } from './complete-vercel-integration/complete-vercel-integration.usecase';
import { GetVercelProjects } from './get-vercel-projects/get-vercel-projects.usecase';
import { SetVercelConfiguration } from './set-vercel-configuration/set-vercel-configuration.usecase';
import { ProcessVercelWebhook } from './process-vercel-webhook/process-vercel-webhook.usecase';

export const USE_CASES = [
  SetVercelConfiguration,
  GetVercelProjects,
  CompleteVercelIntegration,
  GetVercelConfiguration,
  UpdateVercelConfiguration,
  ProcessVercelWebhook,
];
