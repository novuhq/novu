import 'reflect-metadata';

export function copyMetadata(source: any, target: any): void {
  const result = Reflect.getMetadataKeys(source);

  for (const key of result) {
    Reflect.defineMetadata(key, Reflect.getMetadata(key, source), target);
  }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const InstrumentUsecase = (transactionName = ''): any =>
  instrumentationWrapper(transactionName, 'Usecase');

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Instrument = (transactionName = ''): any =>
  instrumentationWrapper(transactionName, 'Function');

function instrumentationWrapper(
  transactionName: string,
  instrumentationType = 'Function'
): any {
  return (target: any, key: any, descriptor: PropertyDescriptor): any => {
    const method = descriptor.value;
    const methodName = transactionName || key;

    const transactionIdentifier =
      instrumentationType + '/' + target?.constructor?.name + '/' + methodName;

    let nr: any = null;
    try {
      // Dynamically load newrelic
      nr = require('newrelic');
    } catch {
      return descriptor;
    }

    if (nr) {
      const isAsync = method.constructor.name === 'AsyncFunction';

      if (!isAsync) {
        descriptor.value = function (...args) {
          return nr.startSegment(transactionIdentifier, true, () => {
            return method.apply(this, args);
          });
        };
      } else {
        descriptor.value = async function (...args) {
          return nr.startSegment(transactionIdentifier, true, async () => {
            return await method.apply(this, args);
          });
        };
      }

      copyMetadata(method, descriptor.value);
    }

    return descriptor;
  };
}
