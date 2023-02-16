import { Injectable } from '@nestjs/common';

import { DistributedLockService } from '../../../shared/services/distributed-lock';

@Injectable()
export class EventsDistributedLockService {
  private readonly distributedLockService = new DistributedLockService();

  public async applyLock<T>(settings, handler: () => Promise<T>): Promise<T> {
    return await this.distributedLockService.applyLock(settings, handler);
  }
}
