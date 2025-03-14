class ErrorContext {
  timestamp: string;
  service: string;
  environment: string;
  traceId?: string;
}

export function parseErrorInformation(
  error: unknown,
  context?: Partial<ErrorContext>
): {
  level: string;
  message: string;
  error: Record<string, any>;
  context?: ErrorContext;
} {
  try {
    // Prepare default context
    const defaultContext: ErrorContext = {
      timestamp: new Date().toISOString(),
      service: process.env.SERVICE_NAME || 'unknown-service',
      environment: process.env.NODE_ENV || 'unknown-env',
    };

    // Merge provided context with default
    const fullContext = { ...defaultContext, ...context };

    // Handle Error objects
    if (error instanceof Error) {
      const errorDetails: Record<string, any> = {
        message: error.message,
        name: error.name,
        type: 'Error',
        // Optional additional properties
        ...('cause' in error && error.cause && { cause: error.cause }),
        ...((error as any).code && { code: (error as any).code }),
        ...((error as any).details && { details: (error as any).details }),
        stack: error.stack?.split('\n').slice(0, 5),
      };

      return {
        level: 'error',
        message: `Error in ${fullContext.service}: ${error.message}`,
        error: errorDetails,
        context: fullContext,
      };
    }

    // Handle string errors
    if (typeof error === 'string') {
      return {
        level: 'error',
        message: `String Error in ${fullContext.service}: ${error}`,
        error: {
          type: 'string',
          value: error,
        },
        context: fullContext,
      };
    }

    // Handle other types of errors
    if (error !== null && error !== undefined) {
      return {
        level: 'error',
        message: `Unknown Error in ${fullContext.service}`,
        error: {
          type: typeof error,
          value: JSON.stringify(error, null, 2),
        },
        context: fullContext,
      };
    }

    // Handle null or undefined
    return {
      level: 'warn',
      message: `No error information available in ${fullContext.service}`,
      error: {
        type: 'null_or_undefined',
      },
      context: fullContext,
    };
  } catch (formatingError) {
    // Fallback in case of formatting error
    return {
      level: 'critical',
      message: 'Critical error in error formatting',
      error: {
        type: 'format_error',
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        details: String(formatingError),
      },
      context: {
        timestamp: new Date().toISOString(),
        service: 'error-formatter',
        environment: '',
      },
    };
  }
}
