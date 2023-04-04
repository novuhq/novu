import { Injectable } from '@nestjs/common';

import { DistributedLockService } from '../../../shared/services/distributed-lock';
import { InMemoryProviderService } from '../../../shared/services/in-memory-provider';

@Injectable()
export class EventsDistributedLockService {
  private readonly distributedLockService;

  constructor(private inMemoryProviderService: InMemoryProviderService) {
    this.distributedLockService = new DistributedLockService(inMemoryProviderService);
  }

  public async applyLock<T>(settings, handler: () => Promise<T>): Promise<T> {
    return await this.distributedLockService.applyLock(settings, handler);
  }
}
