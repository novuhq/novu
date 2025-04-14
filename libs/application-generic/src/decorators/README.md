# Decorators

This directory contains various decorators used throughout the Novu application.

## SetContext Decorator

The `SetContext` decorator is a class decorator that automatically sets the context for the logger before the `execute` and `catch` methods are called. It's designed to be bug-proof and will never throw errors.

### Usage

```typescript
import { Injectable } from '@nestjs/common';
import { PinoLogger } from '../logging';
import { SetContext } from './set-context.decorator';

@Injectable()
@SetContext('MyService')
export class MyService {
  constructor(private readonly logger: PinoLogger) {}

  public execute(): void {
    // The context will be set to "MyService" before this method is called
    this.logger.info('This log will have the context "MyService"');
  }

  public catch(error: Error): void {
    // The context will be set to "MyService" before this method is called
    this.logger.error('An error occurred', error);
  }
}
```

### How it works

The decorator creates a new class that extends the original class and overrides the `execute` and `catch` methods. Before calling the original methods, it sets the context for the logger. This ensures that all log messages from these methods will have the specified context.

The decorator is bug-proof and will never throw errors:
- It checks if the methods exist before calling them
- It handles any errors that might occur during execution
- It returns `undefined` if the original methods don't exist

### Benefits

- Automatically sets the context for all log messages in the `execute` and `catch` methods
- Reduces boilerplate code
- Ensures consistent context naming across the application
- Makes it easier to identify the source of log messages
- Bug-proof implementation that never throws errors 
