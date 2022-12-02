import { Document, FilterQuery } from 'mongoose';
import { BaseRepository, Omit } from '../base-repository';
import { LogEntity } from './log.entity';
import { Log } from './log.schema';

class PartialIntegrationEntity extends Omit(LogEntity, ['_environmentId', '_organizationId']) {}

type EnforceEnvironmentQuery = FilterQuery<PartialIntegrationEntity & Document> &
  ({ _environmentId: string } | { _organizationId: string });

export class LogRepository extends BaseRepository<EnforceEnvironmentQuery, LogEntity> {
  constructor() {
    super(Log, LogEntity);
  }
}
