import { SnapshotEntity } from '@novu/dal';
import { UserSessionData } from '@novu/shared';

export interface RevertResourceStrategy {
  revert(snapshot: SnapshotEntity, user: UserSessionData): Promise<void>;
}
