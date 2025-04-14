import { Injectable } from '@nestjs/common';
import { PinoLogger } from '../logging';
import { SetContext } from './set-context.decorator';

/**
 * Example class demonstrating the use of the SetContext decorator
 */
@Injectable()
@SetContext('ExampleService')
export class ExampleService {
  constructor(private readonly logger: PinoLogger) {}

  /**
   * Example execute method that logs a message
   * The context will be set before this method is called
   */
  public execute(): void {
    this.logger.info('This is an example log message with context set before execution');
  }

  /**
   * Example catch method that logs a message
   * The context will be set before this method is called
   */
  public catch(error: Error): void {
    this.logger.error('An error occurred', error);
  }

  /**
   * Example method that logs a message
   * This method will not have the context set automatically
   */
  public logExample(): void {
    this.logger.info('This is an example log message without automatic context setting');
  }
}
