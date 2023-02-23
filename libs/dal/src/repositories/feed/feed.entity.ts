import { Types } from 'mongoose';

import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export class FeedEntity {
  _id: string;

  name: string;

  identifier: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;
}

export type FeedDBModel = Omit<FeedEntity, '_environmentId' | '_organizationId'> & {
  _environmentId: Types.ObjectId;

  _organizationId: Types.ObjectId;
};
