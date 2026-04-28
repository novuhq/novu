import { DomainRouteTypeEnum } from '@novu/shared';
import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export class DomainRouteEntity {
  _id: string;

  _domainId: string;

  address: string;

  destination?: string;

  type: DomainRouteTypeEnum;

  data?: Record<string, string>;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  createdAt: string;

  updatedAt: string;
}

export type DomainRouteDBModel = ChangePropsValueType<
  DomainRouteEntity,
  '_domainId' | '_environmentId' | '_organizationId'
>;
