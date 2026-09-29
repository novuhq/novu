import { AsyncLocalStorage } from 'node:async_hooks';

export interface BridgeDispatchSlot {
  /** Bridge `deliveryId`s (= agent event envelope `turnId`s) dispatched inside the probed call. */
  deliveryIds: string[];
  /** Runs after a dispatch exhausted its retries and the offline reply was posted. Must not throw. */
  onFailed?: (deliveryId: string) => Promise<void>;
}

const storage = new AsyncLocalStorage<BridgeDispatchSlot>();

/**
 * Lets an ingress that must answer on its own request (Gemini Enterprise) learn which bridge turns
 * its inbound event started, so it can match the turn's `run-finish` / `run-error` by `turnId`.
 */
export const bridgeDispatchProbe = {
  run<T>(slot: BridgeDispatchSlot, operation: () => Promise<T>): Promise<T> {
    return storage.run(slot, operation);
  },

  current(): BridgeDispatchSlot | undefined {
    return storage.getStore();
  },
};
