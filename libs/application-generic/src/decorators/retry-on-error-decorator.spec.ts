import { RetryOnError, RetryOptions } from './retry-on-error-decorator';

// Mock console.warn to verify logging
const mockConsoleWarn = jest.spyOn(console, 'warn');
class CustomError extends Error {}
class TestService {
  private attempts = 0;

  @RetryOnError('CustomError', { maxRetries: 3, delay: 10 })
  async riskyMethod(shouldFail: boolean = true): Promise<string> {
    // eslint-disable-next-line no-plusplus
    this.attempts++;

    if (shouldFail && this.attempts < 3) {
      const error = new CustomError('Operation failed');
      error.name = 'CustomError';
      throw error;
    }

    return 'Success';
  }
}

describe('RetryOnError Decorator', () => {
  let service: TestService;

  beforeEach(() => {
    service = new TestService();
    mockConsoleWarn.mockClear();
  });

  it('should retry on specified error and eventually succeed', async () => {
    const result = await service.riskyMethod();

    expect(result).toBe('Success');
    expect(mockConsoleWarn).toHaveBeenCalledTimes(2); // Should log 3 warning messages
  });

  it('should throw error after max retries', async () => {
    // Create a service with a method that always fails
    class AlwaysFailService {
      @RetryOnError('CustomError', { maxRetries: 2, delay: 10 })
      async alwaysFailMethod(): Promise<string> {
        const error = new Error('Always failing');
        error.name = 'CustomError';
        throw error;
      }
    }

    const alwaysFailService = new AlwaysFailService();

    await expect(alwaysFailService.alwaysFailMethod()).rejects.toThrow('Always failing');

    // Check that warnings were logged
    expect(mockConsoleWarn).toHaveBeenCalledTimes(2);
  });

  it('should not retry on different error types', async () => {
    class DifferentErrorService {
      @RetryOnError('CustomError')
      async methodWithDifferentError(): Promise<string> {
        throw new Error('Different Error');
      }
    }

    const differentErrorService = new DifferentErrorService();

    await expect(differentErrorService.methodWithDifferentError()).rejects.toThrow('Different Error');

    // No warnings should be logged
    expect(mockConsoleWarn).toHaveBeenCalledTimes(0);
  });

  it('should support custom retry options', async () => {
    const customOptions: RetryOptions = {
      maxRetries: 2,
      delay: 50,
      exponentialBackoff: false,
    };

    class CustomOptionsService {
      private attempts = 0;

      @RetryOnError('CustomError', customOptions)
      async methodWithCustomOptions(): Promise<string> {
        // eslint-disable-next-line no-plusplus
        this.attempts++;

        if (this.attempts < 2) {
          const error = new Error('Operation failed');
          error.name = 'CustomError';
          throw error;
        }

        return 'Success';
      }
    }

    const customService = new CustomOptionsService();
    const result = await customService.methodWithCustomOptions();

    expect(result).toBe('Success');
    expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
  });
});
