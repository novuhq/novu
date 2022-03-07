import { CreateIntegration } from './create-integration/create-integration.usecase';
import { GetIntegrations } from './get-integrations/get-integrations.usecase';
import { UpdateIntegration } from './update-integration/update-integration.usecase';
import { RemoveIntegration } from './remove-integration/remove-integration.usecase';

export const USE_CASES = [CreateIntegration, GetIntegrations, UpdateIntegration, RemoveIntegration];
