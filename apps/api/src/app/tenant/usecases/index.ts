import { CreateTenant } from './create-tenant/create-tenant.usecase';
import { GetTenant } from './get-tenant/get-tenant.usecase';
import { UpdateTenant } from './update-tenant/update-tenant.usecase';
import { DeleteTenant } from './delete-tenant/delete-tenant.usecase';

export const USE_CASES = [CreateTenant, GetTenant, UpdateTenant, DeleteTenant];
