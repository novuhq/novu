import { BaseRepository } from '../base-repository';
import { LogEntity } from './log.entity';
import { Log } from './log.schema';

export class LogRepository extends BaseRepository<LogEntity> {
  constructor() {
    super(Log, LogEntity);
  }
}
