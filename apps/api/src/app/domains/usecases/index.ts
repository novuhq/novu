import { CreateDomain } from './create-domain/create-domain.usecase';
import { DeleteDomain } from './delete-domain/delete-domain.usecase';
import { GetDomain } from './get-domain/get-domain.usecase';
import { GetDomains } from './get-domains/get-domains.usecase';
import { UpdateDomain } from './update-domain/update-domain.usecase';
import { VerifyDomain } from './verify-domain/verify-domain.usecase';

export const USE_CASES = [CreateDomain, GetDomains, GetDomain, DeleteDomain, VerifyDomain, UpdateDomain];

export { CreateDomain, DeleteDomain, GetDomain, GetDomains, UpdateDomain, VerifyDomain };
