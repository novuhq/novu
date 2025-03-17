import { parseErrorInformation } from '../logging/error-util';

export class RetryOptions {
  maxRetries?: number;
  delay?: number;
  exponentialBackoff?: boolean;
  // Allow custom error filtering
  shouldRetry?: (error: Error) => boolean;
  // Optional custom logger
  logger?: {
    warn: (message: string) => void;
    error: (message: string) => void;
  };
}

export function RetryOnError(errorName: string, options: RetryOptions = {}) {
  return (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    // eslint-disable-next-line no-param-reassign,func-names
    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      const {
        maxRetries = 3,
        delay = 100,
        exponentialBackoff = true,
        shouldRetry = (error: Error) => error instanceof Error && 'name' in error && error.name === errorName,
        logger = console,
      } = options;

      let retries = 0;

      const getErrorString = (message: string, error: Error) => {
        return JSON.stringify({
          message,
          errorType: 'RetryOnError',
          className: this.constructor.name,
          functionName: propertyKey,
          retryAttempt: `${retries}/${maxRetries}`,
          errorDetails: {
            name: errorName,
            information: parseErrorInformation(error),
          },
          arguments: args,
        });
      };

      do {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          // Use custom error filtering
          if (!shouldRetry(error as Error)) {
            throw error; // Rethrow non-matching errors
          }

          retries += 1;

          // Log warning
          logger.warn(getErrorString('RetryOnError Retrying', error as Error));

          // Calculate delay with exponential backoff
          const currentDelay = exponentialBackoff ? delay * 2 ** (retries - 1) : delay;

          // Wait before retrying
          await new Promise<void>((resolve) => {
            setTimeout(resolve, currentDelay);
          });

          // If max retries reached, log and throw
          if (retries >= maxRetries) {
            logger.error(getErrorString('RetryOnError Max Retries Reached throwing error', error as Error));
            throw error;
          }
        }
      } while (retries < maxRetries);

      // This line should never be reached, but TypeScript requires a return
      throw new Error('Unexpected retry failure');
    };

    return descriptor;
  };
}
