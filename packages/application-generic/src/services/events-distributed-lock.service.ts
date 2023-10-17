import { Injectable } from '@nestjs/common';

import { DistributedLockService, ILockOptions } from './distributed-lock';

@Injectable()
export class EventsDistributedLockService {
  constructor(private distributedLockService: DistributedLockService) {}

  public async applyLock<T>(
    settings: ILockOptions,
    handler: () => Promise<T>
  ): Promise<T> {
    return await this.distributedLockService.applyLock(settings, handler);
  }
}
