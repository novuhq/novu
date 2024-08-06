// from: https://github.com/TehShrike/deepmerge/tree/master

function isMergeableObject(value: unknown) {
  return isNonNullObject(value) && !isSpecial(value as Record<string, unknown>);
}

function isNonNullObject(value: unknown) {
  return !!value && typeof value === 'object';
}

function isSpecial(value: Record<string, unknown>) {
  const stringValue = Object.prototype.toString.call(value);

  return (
    stringValue === '[object RegExp]' ||
    stringValue === '[object Date]' ||
    stringValue === '[object Uint8Array]'
  );
}

function emptyTarget(val: unknown) {
  return Array.isArray(val) ? [] : {};
}

function cloneUnlessOtherwiseSpecified(
  value: Record<string, unknown>,
  options: IOptions
): Record<string, unknown> | Record<string, unknown>[] {
  return options.clone !== false && options.isMergeableObject(value)
    ? deepmerge(emptyTarget(value), value, options)
    : value;
}

function defaultArrayMerge(
  target: Record<string, unknown>[],
  source: Record<string, unknown>[],
  options: IOptions
): Record<string, unknown>[] {
  return target.concat(source).map(function (element) {
    return cloneUnlessOtherwiseSpecified(
      element,
      options
    ) as Record<string, unknown>;
  });
}

function getMergeFunction(key: string, options: IOptions) {
  if (!options.customMerge) {
    return deepmerge;
  }
  const customMerge = options.customMerge(key);

  return typeof customMerge === 'function' ? customMerge : deepmerge;
}

function getKeys(target: Record<string, unknown>): unknown[] {
  return Object.keys(target);
}

function propertyIsOnObject(object: Record<string, unknown>, property: string) {
  try {
    return property in object;
  } catch (_) {
    return false;
  }
}

// Protects from prototype poisoning and unexpected merging up the prototype chain.
function propertyIsUnsafe(target: Record<string, unknown>, key: string) {
  return (
    propertyIsOnObject(target, key) && // Properties are safe to merge if they don't exist in the target yet,
    !(
      Object.hasOwnProperty.call(target, key) && // unsafe if they exist up the prototype chain,
      Object.propertyIsEnumerable.call(target, key)
    )
  ); // and also unsafe if they're nonenumerable.
}

function mergeObject(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  options: IOptions
): Record<string, unknown> {
  const destination = {};
  if (options.isMergeableObject(target)) {
    getKeys(target).forEach((key: string) => {
      destination[key] = cloneUnlessOtherwiseSpecified(
        target[key] as Record<string, unknown>,
        options
      );
    });
  }
  getKeys(source).forEach(function (key: string) {
    if (propertyIsUnsafe(target, key as string)) {
      return;
    }

    if (
      propertyIsOnObject(target, key as string) &&
      options.isMergeableObject(source[key])
    ) {
      destination[key] = getMergeFunction(key as string, options)(
        target[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>,
        options
      );
    } else {
      destination[key] = cloneUnlessOtherwiseSpecified(
        source[key] as Record<string, unknown>,
        options
      );
    }
  });

  return destination;
}

interface IOptions {
  customMerge: (
    key: string
  ) => (
    target: Record<string, unknown>,
    source: Record<string, unknown>,
    options: IOptions
  ) => Record<string, unknown>;
  arrayMerge: (
    target: Record<string, unknown>[],
    source: Record<string, unknown>[],
    options: IOptions
  ) => Record<string, unknown>[];
  isMergeableObject: (value: unknown) => boolean;
  cloneUnlessOtherwiseSpecified: (
    value: Record<string, unknown>,
    options: IOptions
  ) => Record<string, unknown> | Record<string, unknown>[];
  clone?: boolean;
}

interface IDeepmergeOptions {
  customMerge?: (
    key: string
  ) => (
    target: Record<string, unknown>,
    source: Record<string, unknown>,
    options: IOptions
  ) => Record<string, unknown>;
  arrayMerge?: (
    target: Record<string, unknown>[],
    source: Record<string, unknown>[],
    options: IOptions
  ) => Record<string, unknown>[];
  isMergeableObject?: (value: unknown) => boolean;
  cloneUnlessOtherwiseSpecified?: (
    value: Record<string, unknown>,
    options: IOptions
  ) => Record<string, unknown> | Record<string, unknown>[];
  clone?: boolean;
}

export function deepmerge<
  Output = Record<string, unknown> | Record<string, unknown>[]
>(
  target: Record<string, unknown> | Record<string, unknown>[],
  source: Record<string, unknown> | Record<string, unknown>[],
  options?: IDeepmergeOptions
): Output {
  options = options || {};
  options.arrayMerge = options.arrayMerge || defaultArrayMerge;
  options.isMergeableObject = options.isMergeableObject || isMergeableObject;
  /*
   * cloneUnlessOtherwiseSpecified is added to `options` so that custom arrayMerge()
   * implementations can use it. The caller may not replace it.
   */
  options.cloneUnlessOtherwiseSpecified = cloneUnlessOtherwiseSpecified;

  const sourceIsArray = Array.isArray(source);
  const targetIsArray = Array.isArray(target);
  const sourceAndTargetTypesMatch = sourceIsArray === targetIsArray;

  if (!sourceAndTargetTypesMatch) {
    return cloneUnlessOtherwiseSpecified(
      source as Record<string, unknown>,
      options as IOptions
    ) as Output;
  }
  if (sourceIsArray) {
    return options.arrayMerge(
      target as Record<string, unknown>[],
      source as Record<string, unknown>[],
      options as IOptions
    ) as Output;
  }

  return mergeObject(
    target as Record<string, unknown>,
    source,
    options as IOptions
  ) as Output;
}

export function deepmergeAll(array: unknown[], options?: IDeepmergeOptions) {
  if (!Array.isArray(array)) {
    throw new Error('first argument should be an array');
  }

  return array.reduce(function (prev, next) {
    return deepmerge(prev, next, options);
  }, {});
}
