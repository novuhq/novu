import { Injectable } from '@nestjs/common';

import { DistributedLockService } from './distributed-lock';

@Injectable()
export class EventsDistributedLockService {
  constructor(private distributedLockService: DistributedLockService) {}

  public async applyLock<T>(settings, handler: () => Promise<T>): Promise<T> {
    return await this.distributedLockService.applyLock(settings, handler);
  }
}
