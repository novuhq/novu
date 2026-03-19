import type { ClientSession } from 'mongoose';
import type { EnforceEnvOrOrgIds } from '../../types';
import { BaseRepository } from '../base-repository';
import { SnapshotDBModel, SnapshotEntity } from './snapshot.entity';
import { Snapshot } from './snapshot.schema';

export class SnapshotRepository extends BaseRepository<SnapshotDBModel, SnapshotEntity, EnforceEnvOrOrgIds> {
  constructor() {
    super(Snapshot, SnapshotEntity);
  }

  async createSnapshot(
    snapshot: Omit<SnapshotEntity, '_id' | 'createdAt' | 'updatedAt'>,
    options: { session?: ClientSession | null } = {}
  ): Promise<SnapshotEntity> {
    return this.create(snapshot, options);
  }

  async deleteSnapshot(
    environmentId: string,
    snapshotId: string,
    options: { session?: ClientSession | null } = {}
  ): Promise<void> {
    await this.delete({ _id: snapshotId, _environmentId: environmentId }, { session: options.session });
  }

  async deleteSnapshots(
    environmentId: string,
    snapshotIds: string[],
    options: { session?: ClientSession | null } = {}
  ): Promise<void> {
    await this.delete({ _id: { $in: snapshotIds }, _environmentId: environmentId }, { session: options.session });
  }

  async findByIds(environmentId: string, snapshotIds: string[]): Promise<SnapshotEntity[]> {
    return this.find({ _id: { $in: snapshotIds }, _environmentId: environmentId }, undefined, {
      sort: { createdAt: -1 },
    });
  }
}
