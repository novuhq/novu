import { ConnectUserCancelledError } from '../errors';

export type PendingInteractionRegistry = {
  register<T>(run: (resolve: (value: T) => void, reject: (error: Error) => void) => void): Promise<T>;
  cancel(): void;
};

export function createPendingInteractionRegistry(): PendingInteractionRegistry {
  let cancelPendingInteraction: (() => void) | undefined;

  const clearPendingInteractionCancel = () => {
    cancelPendingInteraction = undefined;
  };

  return {
    register<T>(run: (resolve: (value: T) => void, reject: (error: Error) => void) => void): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        const finish = (settle: () => void) => {
          if (cancelPendingInteraction === cancel) {
            clearPendingInteractionCancel();
          }

          settle();
        };

        const cancel = () => finish(() => reject(new ConnectUserCancelledError()));

        cancelPendingInteraction = cancel;

        run(
          (value) => finish(() => resolve(value)),
          (error) => finish(() => reject(error))
        );
      });
    },
    cancel() {
      cancelPendingInteraction?.();
      clearPendingInteractionCancel();
    },
  };
}
