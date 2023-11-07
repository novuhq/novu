import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';
import type { IEntity, TransformEntityToDbModel } from '../../types';

export class FeedEntity implements IEntity {
  _id: string;

  name: string;

  identifier: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;
}

export type FeedDBModel = TransformEntityToDbModel<FeedEntity>;
