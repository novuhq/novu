import { CreateDomain } from './create-domain/create-domain.usecase';
import { CreateDomainConnectApplyUrl } from './create-domain-connect-apply-url/create-domain-connect-apply-url.usecase';
import { CreateDomainRoute } from './create-domain-route/create-domain-route.usecase';
import { DeleteDomain } from './delete-domain/delete-domain.usecase';
import { DeleteDomainRoute } from './delete-domain-route/delete-domain-route.usecase';
import { DiagnoseDomain } from './diagnose-domain/diagnose-domain.usecase';
import { GetDomain } from './get-domain/get-domain.usecase';
import { GetDomainConnectStatus } from './get-domain-connect-status/get-domain-connect-status.usecase';
import { GetDomainRoute } from './get-domain-route/get-domain-route.usecase';
import { GetDomains } from './get-domains/get-domains.usecase';
import { InboundDomainRouteDelivery } from '@novu/application-generic';

import { ListDomainRoutes } from './list-domain-routes/list-domain-routes.usecase';
import { TestDomainRoute } from './test-domain-route/test-domain-route.usecase';
import { UpdateDomain } from './update-domain/update-domain.usecase';
import { UpdateDomainRoute } from './update-domain-route/update-domain-route.usecase';
import { VerifyDomain } from './verify-domain/verify-domain.usecase';

export const USE_CASES = [
  CreateDomain,
  GetDomains,
  GetDomain,
  DeleteDomain,
  VerifyDomain,
  DiagnoseDomain,
  UpdateDomain,
  ListDomainRoutes,
  CreateDomainRoute,
  GetDomainRoute,
  UpdateDomainRoute,
  DeleteDomainRoute,
  InboundDomainRouteDelivery,
  TestDomainRoute,
  GetDomainConnectStatus,
  CreateDomainConnectApplyUrl,
];

export {
  CreateDomain,
  CreateDomainConnectApplyUrl,
  CreateDomainRoute,
  DeleteDomain,
  DeleteDomainRoute,
  DiagnoseDomain,
  TestDomainRoute,
  GetDomain,
  GetDomainConnectStatus,
  GetDomainRoute,
  GetDomains,
  ListDomainRoutes,
  UpdateDomain,
  UpdateDomainRoute,
  VerifyDomain,
};
