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
          const errorString = formatErrorToEmbeddableString(error);
          retries += 1;
          console.warn(
            `RetryOnError Decorator: Error Thrown:
             ClassName: [${this.constructor.name}]
             Function Name: [${propertyKey}] 
             Retrying ${retries}/${maxRetries} 
             Error Causing Retry:
             ${errorName} : ${errorString}
             ARGS: ${JSON.stringify(args)}
             `
          );
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
function formatErrorToEmbeddableString(error: unknown): string {
  try {
    // Handle Error objects
    if (error instanceof Error) {
      const errorDetails: Record<string, any> = {
        message: error.message,
        name: error.name,
        // Optional additional properties
        ...((error as any).code && { code: (error as any).code }),
        ...((error as any).details && { details: (error as any).details }),
      };

      // Create a formatted multi-line string
      return [
        `🔴 Error Occurred: ${error.name}`,
        `📝 Message: ${error.message}`,
        ...(errorDetails.code ? [`🔢 Code: ${errorDetails.code}`] : []),
        ...(errorDetails.details ? [`ℹ️ Details: ${JSON.stringify(errorDetails.details)}`] : []),
        `📍 Stack Trace: ${error.stack?.split('\n').slice(0, 5).join('\n') || 'No stack trace available'}`,
      ].join('\n');
    }

    // Handle string errors
    if (typeof error === 'string') {
      return `🔴 String Error: ${error}`;
    }

    // Handle other types of errors
    if (error !== null && error !== undefined) {
      return ['🔴 Unknown Error Type', `📝 Type: ${typeof error}`, `📍 Value: ${JSON.stringify(error, null, 2)}`].join(
        '\n'
      );
    }

    // Handle null or undefined
    return '🔴 No error information available';
  } catch (formatError) {
    // Fallback in case of formatting error
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return `🔴 Error in error formatting: ${String(formatError)}`;
  }
}
