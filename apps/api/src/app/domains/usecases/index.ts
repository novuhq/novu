import { CreateDomain } from './create-domain/create-domain.usecase';
import { CreateDomainConnectApplyUrl } from './create-domain-connect-apply-url/create-domain-connect-apply-url.usecase';
import { DeleteDomain } from './delete-domain/delete-domain.usecase';
import { GetDomain } from './get-domain/get-domain.usecase';
import { GetDomainConnectStatus } from './get-domain-connect-status/get-domain-connect-status.usecase';
import { GetDomains } from './get-domains/get-domains.usecase';
import { UpdateDomain } from './update-domain/update-domain.usecase';
import { VerifyDomain } from './verify-domain/verify-domain.usecase';

export const USE_CASES = [
  CreateDomain,
  GetDomains,
  GetDomain,
  DeleteDomain,
  VerifyDomain,
  UpdateDomain,
  GetDomainConnectStatus,
  CreateDomainConnectApplyUrl,
];

export {
  CreateDomain,
  CreateDomainConnectApplyUrl,
  DeleteDomain,
  GetDomain,
  GetDomainConnectStatus,
  GetDomains,
  UpdateDomain,
  VerifyDomain,
};
