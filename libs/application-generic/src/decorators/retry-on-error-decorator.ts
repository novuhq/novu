export class RetryOptions {
  maxRetries?: number;
  delay?: number;
  exponentialBackoff?: boolean;
}

export function RetryOnError(errorName: string, options: RetryOptions = {}) {
  return (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    // eslint-disable-next-line no-param-reassign,func-names
    descriptor.value = async function (...args: unknown[]) {
      const { maxRetries = 3, delay = 100, exponentialBackoff = true } = options;
      let retries = 0;
      while (retries < maxRetries) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          if (!(error instanceof Error && 'name' in error && error.name === errorName)) {
            throw error; // Rethrow non-matching errors
          }
          console.warn(
            `RetryOnError Decorator:\n
             ClassName: [${this.constructor.name}]\n
             Function Name: [${propertyKey}] Retrying ${retries + 1}/${maxRetries} due to error:`,
            errorName,
            'args:',
            JSON.stringify(args)
          );

          retries += 1;
          const currentDelay = exponentialBackoff
            ? delay * 2 ** (retries - 1) // Exponential backoff
            : delay;
          // Wait before retrying
          await new Promise<void>((resolve) => {
            setTimeout(() => resolve(), currentDelay);
          });
          if (retries >= maxRetries) {
            throw error; // Rethrow if max retries reached
          }
        }
      }
    };

    return descriptor;
  };
}
