import { DomainRouteTypeEnum, DomainStatusEnum } from '@novu/shared';
import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export class DomainRoute {
  address: string;

  destination?: string;

  type: DomainRouteTypeEnum;
}

export class DomainEntity {
  _id: string;

  name: string;

  status: DomainStatusEnum;

  mxRecordConfigured: boolean;

  dnsProvider?: string;

  routes: DomainRoute[];

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  createdAt: string;

  updatedAt: string;
}

export type DomainDBModel = ChangePropsValueType<DomainEntity, '_environmentId' | '_organizationId'>;
