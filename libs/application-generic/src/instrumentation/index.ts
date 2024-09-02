import 'reflect-metadata';

export function copyMetadata(source: any, target: any): void {
  const result = Reflect.getMetadataKeys(source);

  for (const key of result) {
    Reflect.defineMetadata(key, Reflect.getMetadata(key, source), target);
  }
}

export const InstrumentUsecase = (transactionName = ''): any =>
  instrumentationWrapper(transactionName, 'Usecase');

export const Instrument = (transactionName = ''): any =>
  instrumentationWrapper(transactionName, 'Function');

function instrumentationWrapper(
  transactionName: string,
  instrumentationType = 'Function',
): any {
  return (target: any, key: any, descriptor: PropertyDescriptor): any => {
    const method = descriptor.value;
    const methodName = transactionName || key;

    const transactionIdentifier = `${instrumentationType}/${target?.constructor?.name}/${methodName}`;

    let nr: any = null;
    try {
      // Dynamically load newrelic
      // eslint-disable-next-line global-require
      nr = require('newrelic');
    } catch {
      return descriptor;
    }

    if (nr) {
      const isAsync = method.constructor.name === 'AsyncFunction';

      if (!isAsync) {
        // eslint-disable-next-line no-param-reassign
        descriptor.value = function (...args) {
          return nr.startSegment(transactionIdentifier, true, () => {
            return method.apply(this, args);
          });
        };
      } else {
        // eslint-disable-next-line no-param-reassign
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
