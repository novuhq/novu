// from https://github.com/blakeembrey/change-case/tree/main

import {
  camelCaseTransformer,
  capitalCaseTransformer,
  constantCaseTransformer,
  dotCaseTransformer,
  IOptions,
  IPascalCaseOptions,
  kebabCaseTransformer,
  noCaseTransformer,
  pascalCaseTransformer,
  pathCaseTransformer,
  sentenceCaseTransformer,
  snakeCaseTransformer,
  trainCaseTransformer,
} from './functions';

const isObject = (object: unknown) =>
  object !== null && typeof object === 'object';

function changeKeysFactory<Options extends IOptions = IOptions>(
  changeCase: (input: string, options?: IOptions) => string,
): (object: unknown, options?: Options) => unknown {
  return function changeKeys(object: unknown, options?: Options): unknown {
    const depth = options?.depth || 10000;

    if (depth === 0 || !isObject(object)) return object;

    if (Array.isArray(object)) {
      return object.map((item) =>
        changeKeys(item, { ...options, depth: depth - 1 }),
      );
    }

    const result: Record<string, unknown> = Object.create(
      Object.getPrototypeOf(object),
    );

    Object.keys(object as object).forEach((key) => {
      const value = (object as Record<string, unknown>)[key];
      let changedKey = changeCase(key, options);
      if (options && options.keyCaseTransformer) {
        changedKey = options.keyCaseTransformer(changedKey);
      }
      const changedValue = changeKeys(value, { ...options, depth: depth - 1 });
      result[changedKey] = changedValue;
    });

    return result;
  };
}

export const camelCase =
  changeKeysFactory<IPascalCaseOptions>(camelCaseTransformer);
export const constantCase = changeKeysFactory(constantCaseTransformer);
export const dotCase = changeKeysFactory(dotCaseTransformer);
export const trainCase = changeKeysFactory(trainCaseTransformer);
export const kebabCase = changeKeysFactory(kebabCaseTransformer);
export const pascalCase = changeKeysFactory<IPascalCaseOptions>(
  pascalCaseTransformer,
);
export const pathCase = changeKeysFactory(pathCaseTransformer);
export const sentenceCase = changeKeysFactory(sentenceCaseTransformer);
export const snakeCase = changeKeysFactory(snakeCaseTransformer);
