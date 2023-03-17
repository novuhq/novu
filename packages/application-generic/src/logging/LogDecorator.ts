import { Logger, LoggerService } from '@nestjs/common';

export type Transform = (data: any) => any;

export interface IOptions {
  logger?: LoggerService;
  transform?: Transform;
  timestamp?: boolean;
}

const DEFAULT_OPTIONS: IOptions = {
  timestamp: true,
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const LogDecorator = (options = DEFAULT_OPTIONS) => {
  return (
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<any>
  ): void => {
    const logger = options?.logger || new Logger(target?.constructor?.name);
    const method = descriptor?.value;

    descriptor.value = async function <T>(...args: unknown[]): Promise<T> {
      const currentTime = Date.now();
      logger.debug(
        {
          input: {
            ...((options?.transform ? options?.transform(args) : args) || {}),
          },
        },
        `"${target?.constructor?.name}.${propertyName}" invoke`
      );

      const data = await method.apply(this, args);

      const executeTime = options?.timestamp
        ? `${Date.now() - currentTime}`
        : '';

      logger.debug(
        {
          executionTimeMs: executeTime,
          result: { ...(options?.transform ? options?.transform(data) : data) },
        },
        `"${target?.constructor?.name}.${propertyName}" result`
      );

      return data;
    };
  };
};
