import { BaseRepository } from '../base-repository';
import { LogEntity, LogDBModel } from './log.entity';
import { Log } from './log.schema';

export class LogRepository extends BaseRepository<LogDBModel, LogEntity> {
  constructor() {
    super(Log, LogEntity);
  }
}
