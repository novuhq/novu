import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';

/**
 * Extra delivery facts an adapter's Nest-side delivery callback can report for
 * the operation currently in flight. Platform result types (chat-sdk
 * `SentMessage`) can't carry these, so they ride a per-call slot instead.
 */
export interface ReportedDeliveryInfo {
  /** Authoritative activity/message id chosen by the delivery layer. */
  messageId?: string;
  /** Conversation event sequence allocated at live emit time. */
  sequence?: number;
}

/**
 * Per-call result channel between the channel-agnostic {@link OutboundGateway}
 * and in-process delivery callbacks (currently only agent chat). The gateway
 * `collect`s around one adapter invocation; a delivery callback running inside
 * it may `report` facts the gateway needs for durable persist. Channels whose
 * delivery happens on an external platform never report — `info` stays empty.
 */
@Injectable()
export class OutboundDeliveryInfo {
  private readonly storage = new AsyncLocalStorage<ReportedDeliveryInfo>();

  async collect<T>(operation: () => Promise<T>): Promise<{ result: T; info: ReportedDeliveryInfo }> {
    const info: ReportedDeliveryInfo = {};
    const result = await this.storage.run(info, operation);

    return { result, info };
  }

  /** No-op when the current call was not started via {@link collect}. */
  report(info: ReportedDeliveryInfo): void {
    const slot = this.storage.getStore();
    if (!slot) {
      return;
    }

    Object.assign(slot, info);
  }
}
