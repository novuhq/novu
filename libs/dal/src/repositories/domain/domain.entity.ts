import { DomainStatusEnum, type InboundSenderAuthInput } from '@novu/shared';
import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export class DomainEntity {
  _id: string;

  name: string;

  status: DomainStatusEnum;

  mxRecordConfigured: boolean;

  dnsProvider?: string;

  data?: Record<string, string>;

  /**
   * Which DKIM/SPF verdicts must be `pass` before an inbound agent email
   * resolves a sender. Absent means both checks are required.
   */
  inboundSenderAuth?: InboundSenderAuthInput;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  createdAt: string;

  updatedAt: string;
}

export type DomainDBModel = ChangePropsValueType<DomainEntity, '_environmentId' | '_organizationId'>;
