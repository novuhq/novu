import { DecorateAll } from 'decorate-all';
import { Logger } from '@nestjs/common';
import { getLogLevel } from './index';
import { maskValue } from './masking';

export function log() {
  return (
    target: any,
    propertyKey: string,
    propertyDescriptor: PropertyDescriptor
  ) => {
    const originalMethod = propertyDescriptor.value;

    // Formats args in: { methodName: "name", args: [{"name": "value"}] }
    propertyDescriptor.value = async function (...args: any[]) {
      const item = {
        methodName: `${this.constructor.name}.${propertyKey}`,
        args: [],
      };

      if (
        typeof args !== undefined &&
        args !== null &&
        getLogLevel() === 'debug'
      ) {
        //args.forEach((value) => {
        const test = await Promise.all(
          args.map(async (value) => {
            if (value !== undefined && value !== null) {
              try {
                item.args.push({
                  [value.constructor.name]: maskValue(
                    value.constructor.name,
                    value
                  ),
                });
              } catch (e) {
                Logger.error(
                  'unable to mask data from: ' + JSON.stringify(value),
                  e
                );
              }
            }
          })
        );
        //});

        Logger.debug(JSON.stringify(item));

        return await originalMethod.apply(this, args);
      }
    };
  };
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/naming-convention
export const LogDecorator = () => DecorateAll(log(), { deep: true });
