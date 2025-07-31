import 'reflect-metadata';

function copyMetadata(source: any, target: any): void {
  const result = Reflect.getMetadataKeys(source);

  for (const key of result) {
    Reflect.defineMetadata(key, Reflect.getMetadata(key, source), target);
  }
}

type InstrumentationOptions = {
  transactionName?: string;
  buildTransactionIdSuffix?: (...args: any[]) => string;
};

export const InstrumentUsecase = ({
  transactionName = '',
  buildTransactionIdSuffix,
}: InstrumentationOptions = {}): any =>
  instrumentationWrapper({
    transactionName,
    instrumentationType: 'Usecase',
    buildTransactionIdSuffix,
  });

export const Instrument = ({ transactionName = '', buildTransactionIdSuffix }: InstrumentationOptions = {}): any =>
  instrumentationWrapper({
    transactionName,
    instrumentationType: 'Function',
    buildTransactionIdSuffix,
  });

function instrumentationWrapper({
  transactionName = '',
  instrumentationType = 'Function',
  buildTransactionIdSuffix,
}: InstrumentationOptions & { instrumentationType: string }): any {
  return (target: any, key: any, descriptor: PropertyDescriptor): any => {
    const method = descriptor.value;
    const methodName = transactionName || key;

    const transactionIdentifierBase = `${instrumentationType}/${target?.constructor?.name}/${methodName}`;

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
        descriptor.value = function instrumentedMethod(...args: unknown[]) {
          const transactionIdentifier = buildTransactionId(transactionIdentifierBase, buildTransactionIdSuffix, args);

          return nr.startSegment(transactionIdentifier, true, () => {
            return method.apply(this, args);
          });
        };
      } else {
        descriptor.value = async function instrumentedAsyncMethod(...args: unknown[]) {
          const transactionIdentifier = buildTransactionId(transactionIdentifierBase, buildTransactionIdSuffix, args);

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

const buildTransactionId = (
  transactionIdentifierBase: string,
  buildSuffix: InstrumentationOptions['buildTransactionIdSuffix'],
  args: unknown[]
): string => {
  const suffix = buildSuffix ? `:${buildSuffix(...args)}` : '';

  return `${transactionIdentifierBase}${suffix}`;
};
