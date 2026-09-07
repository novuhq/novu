import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { shutdownOtel } from './otel-init';

/**
 * Handles graceful OTEL SDK shutdown when the NestJS module is destroyed.
 * The SDK itself is started early in otel-init.ts (before NestJS bootstrap)
 * so that auto-instrumentations can patch modules at require() time.
 */
@Injectable()
export class TracingService implements OnModuleDestroy {
  async onModuleDestroy() {
    await shutdownOtel();
  }
}
