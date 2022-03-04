import { CreateIntegration } from './create-integration/create-integration.usecase';
import { GetIntegration } from './get-integration/get-integration.usecase';
import { UpdateIntegration } from './update-integration/update-integration.usecase';
import { RemoveIntegration } from './remove-integration/remove-integration.usecase';

export const USE_CASES = [CreateIntegration, GetIntegration, UpdateIntegration, RemoveIntegration];
