import 'reflect-metadata';

export function copyMetadata(source: any, target: any): void {
  const result = Reflect.getMetadataKeys(source);

  for (const key of result) {
    Reflect.defineMetadata(key, Reflect.getMetadata(key, source), target);
  }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const InstrumentUsecase =
  (transactionName = ''): any =>
  (target: any, key: any, descriptor: PropertyDescriptor): any => {
    const method = descriptor.value;

    const transactionIdentifier =
      'Usecase/' +
      (transactionName || target?.constructor?.name || key.toString());

    let nr: any = null;
    try {
      // Dynamically load newrelic
      nr = require('newrelic');
    } catch {
      return descriptor;
    }

    if (nr) {
      descriptor.value = async function (...args) {
        return nr.startSegment(transactionIdentifier, true, async () => {
          return await method.apply(this, args);
        });
      };

      copyMetadata(method, descriptor.value);
    }

    return descriptor;
  };
