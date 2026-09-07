export class NovuError extends Error {
  originalError: Error;

  constructor(message: string, originalError: unknown) {
    super(message);
    this.originalError = originalError as Error;
  }
}
