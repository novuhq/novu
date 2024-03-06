interface ICustomMatchers<R = unknown> {
  objectToEqual(key: string, value: unknown): R;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    // eslint-disable-next-line @typescript-eslint/naming-convention,@typescript-eslint/no-empty-interface
    interface Expect extends ICustomMatchers {}

    // eslint-disable-next-line @typescript-eslint/naming-convention,@typescript-eslint/no-empty-interface
    interface Matchers<R> extends ICustomMatchers<R> {}

    // eslint-disable-next-line @typescript-eslint/naming-convention,@typescript-eslint/no-empty-interface
    interface InverseAsymmetricMatchers extends ICustomMatchers {}
  }
}

export function objectToEqual(
  actual: string | object,
  key: string,
  value: unknown
) {
  if (typeof actual !== 'string' && typeof actual !== 'object') {
    throw new TypeError('Actual value must be a stringified object or object');
  } else if (typeof key !== 'string') {
    throw new TypeError(
      'Key must be a string (optionally with . for sub keys)'
    );
  }

  let currentObject = typeof actual === 'string' ? JSON.parse(actual) : actual;
  const subKeys = key.split('.');
  const finalKey = subKeys.pop();

  const invalidKeyMessageFactory = (object: object, subKey: string) => () =>
    `expected ${this.utils.printReceived(
      object
    )} to be an object with key ${subKey}`;

  for (const subKey of subKeys) {
    if (typeof currentObject[subKey] !== 'object') {
      return {
        message: invalidKeyMessageFactory(currentObject, subKey),
        pass: false,
      };
    }
    currentObject = currentObject[subKey];
  }

  if (currentObject[finalKey] !== value) {
    return {
      message: () =>
        `expected ${this.utils.printReceived(
          currentObject
        )} to have attribute ${key} with value ${String(value)}`,
      pass: false,
    };
  }

  return {
    message: () =>
      `expected ${this.utils.printReceived(
        currentObject
      )} to have attribute ${key} with value ${String(value)}`,
    pass: true,
  };
}
