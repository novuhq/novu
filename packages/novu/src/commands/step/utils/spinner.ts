import ora from 'ora';
import { red } from 'picocolors';

export async function withSpinner<T>(
  message: string,
  fn: () => Promise<T>,
  options?: {
    successMessage?: string | ((result: T) => string);
    failMessage?: string;
    exitOnError?: boolean;
  }
): Promise<T> {
  const spinner = ora(message).start();

  try {
    const result = await fn();
    const successMsg =
      typeof options?.successMessage === 'function'
        ? options.successMessage(result)
        : (options?.successMessage ?? message);
    spinner.succeed(successMsg);

    return result;
  } catch (error) {
    spinner.fail(options?.failMessage);
    console.error('');
    if (error instanceof Error) {
      console.error(red(error.message));
    }
    console.error('');

    if (options?.exitOnError !== false) {
      process.exit(1);
    }
    throw error;
  }
}
