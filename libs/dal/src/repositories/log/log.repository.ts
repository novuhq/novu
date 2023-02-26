import { BaseRepository, Omit } from '../base-repository';
import { LogEntity } from './log.entity';
import { Log } from './log.schema';
import { Document, FilterQuery } from 'mongoose';

class PartialLogEntity extends Omit(LogEntity, ['_environmentId', '_organizationId']) {}

type EnforceEnvironmentQuery = FilterQuery<PartialLogEntity & Document> &
  ({ _environmentId: string } | { _organizationId: string });

export class LogRepository extends BaseRepository<EnforceEnvironmentQuery, LogEntity> {
  constructor() {
    super(Log, LogEntity);
  }
}
