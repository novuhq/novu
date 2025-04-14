import { PinoLogger } from '../logging';

/**
 * Decorator that sets the context for the current class
 * @param context The context to set for the class
 * @returns ClassDecorator
 */
export function SetContext(context: string): ClassDecorator {
  return function (target: any): any {
    // Store the original constructor
    const originalConstructor = target;

    // Create a new constructor that extends the original
    const constructor = class extends originalConstructor {
      // Override the execute method if it exists
      execute(...args: any[]): any {
        try {
          // Set the context before executing
          if (this.logger && typeof this.logger.setContext === 'function') {
            this.logger.setContext(context);
          }

          // Call the original execute method if it exists
          if (typeof super.execute === 'function') {
            return super.execute(...args);
          }

          // If execute doesn't exist, return undefined
          return undefined;
        } catch (error) {
          // Log the error but don't throw
          console.error('Error in SetContext decorator execute method:', error);

          return undefined;
        }
      }

      // Override the catch method if it exists
      catch(...args: any[]): any {
        try {
          // Set the context before executing
          if (this.logger && typeof this.logger.setContext === 'function') {
            this.logger.setContext(context);
          }

          // Call the original catch method if it exists
          if (typeof super.catch === 'function') {
            return super.catch(...args);
          }

          // If catch doesn't exist, return undefined
          return undefined;
        } catch (error) {
          // Log the error but don't throw
          console.error('Error in SetContext decorator catch method:', error);

          return undefined;
        }
      }
    };

    // Copy static properties
    Object.setPrototypeOf(constructor, originalConstructor);

    return constructor;
  };
}
