import { BaseRepository } from '../base-repository';
import type { EnforceEnvOrOrgIds } from '../../types/enforce';
import { LogEntity, LogDBModel } from './log.entity';
import { Log } from './log.schema';

export class LogRepository extends BaseRepository<LogDBModel, LogEntity, EnforceEnvOrOrgIds> {
  constructor() {
    super(Log, LogEntity);
  }
}
