import { DecorateAll } from 'decorate-all';
import { Logger } from '@nestjs/common';
import { maskValue } from './masking';

export function log() {
  return (
    target: any,
    propertyKey: string,
    propertyDescriptor: PropertyDescriptor
  ) => {
    const originalMethod = propertyDescriptor.value;

    propertyDescriptor.value = async function (...args: any[]) {
      // { methodName: "name", args: [{"name": "value"}] }
      const item = {
        methodName: `${this.constructor.name}.${propertyKey}`,
        args: [],
      };

      const promises = args.map(async (value) => {
        item.args.push({
          [value.constructor.name]: maskValue(value.constructor.name, value),
        });
      });

      await Promise.all(promises);

      Logger.debug(JSON.stringify(item));

      return await originalMethod.apply(this, args);
    };
  };
}

// FIXME
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const logDecorator = () => DecorateAll(log(), { deep: true });
