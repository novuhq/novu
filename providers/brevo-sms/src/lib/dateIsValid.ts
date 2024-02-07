interface ICustomMatchers<R = unknown> {
  dateIsValid(): R;
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

export function dateIsValid(actual: string | object) {
  if (typeof actual !== 'string') {
    throw new TypeError('Actual value must be a date in iso format');
  }

  return {
    message: () =>
      `expected ${this.utils.printReceived(actual)} to be a valid string date`,
    pass: !isNaN(+new Date(actual)),
  };
}
