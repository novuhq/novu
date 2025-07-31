import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export class FeedEntity {
  _id: string;

  name: string;

  identifier: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;
}

export type FeedDBModel = ChangePropsValueType<FeedEntity, '_environmentId' | '_organizationId'>;
