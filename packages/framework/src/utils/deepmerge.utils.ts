// from: https://github.com/TehShrike/deepmerge/tree/master

function isMergeableObject(value: unknown) {
  return isNonNullObject(value) && !isSpecial(value as Record<string, unknown>);
}

function isNonNullObject(value: unknown) {
  return !!value && typeof value === 'object';
}

function isSpecial(value: Record<string, unknown>) {
  const stringValue = Object.prototype.toString.call(value);

  return stringValue === '[object RegExp]' || stringValue === '[object Date]' || isReactElement(value);
}

// see https://github.com/facebook/react/blob/b5ac963fb791d1298e7f396236383bc955f916c1/src/isomorphic/classic/element/ReactElement.js#L21-L25
const canUseSymbol = typeof Symbol === 'function' && Symbol.for;
const REACT_ELEMENT_TYPE = canUseSymbol ? Symbol.for('react.element') : 0xeac7;

function isReactElement(value: Record<string, unknown>) {
  return value.$$typeof === REACT_ELEMENT_TYPE;
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
    return cloneUnlessOtherwiseSpecified(element, options) as Record<string, unknown>;
  });
}

function getMergeFunction(key: string, options: IOptions) {
  if (!options.customMerge) {
    return deepmerge;
  }
  const customMerge = options.customMerge(key);

  return typeof customMerge === 'function' ? customMerge : deepmerge;
}

function getEnumerableOwnPropertySymbols(target: Record<string, unknown>): symbol[] {
  return Object.getOwnPropertySymbols
    ? Object.getOwnPropertySymbols(target).filter(function (symbol) {
        return Object.propertyIsEnumerable.call(target, symbol);
      })
    : [];
}

function getKeys(target: Record<string, unknown>): unknown[] {
  return [...Object.keys(target), ...getEnumerableOwnPropertySymbols(target)];
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

function mergeObject(target: Record<string, unknown>, source: Record<string, unknown>, options: IOptions) {
  const destination = {};
  if (options.isMergeableObject(target)) {
    getKeys(target).forEach((key) => {
      destination[key] = cloneUnlessOtherwiseSpecified(target[key], options);
    });
  }
  getKeys(source).forEach(function (key) {
    if (propertyIsUnsafe(target, key as string)) {
      return;
    }

    if (propertyIsOnObject(target, key as string) && options.isMergeableObject(source[key])) {
      destination[key] = getMergeFunction(key as string, options)(target[key], source[key], options);
    } else {
      destination[key] = cloneUnlessOtherwiseSpecified(source[key], options);
    }
  });

  return destination;
}

interface IOptions {
  customMerge: (
    key: string
  ) => (target: Record<string, unknown>, source: Record<string, unknown>, options: IOptions) => Record<string, unknown>;
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
  ) => (target: Record<string, unknown>, source: Record<string, unknown>, options: IOptions) => Record<string, unknown>;
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

export function deepmerge(
  target: Record<string, unknown> | Record<string, unknown>[],
  source: Record<string, unknown> | Record<string, unknown>[],
  options?: IDeepmergeOptions
): Record<string, unknown> | Record<string, unknown>[] {
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
    return cloneUnlessOtherwiseSpecified(source as Record<string, unknown>, options as IOptions);
  }
  if (sourceIsArray) {
    return options.arrayMerge(
      target as Record<string, unknown>[],
      source as Record<string, unknown>[],
      options as IOptions
    );
  }

  return mergeObject(target as Record<string, unknown>, source, options as IOptions);
}

export function deepmergeAll(array: unknown[], options: IDeepmergeOptions) {
  if (!Array.isArray(array)) {
    throw new Error('first argument should be an array');
  }

  return array.reduce(function (prev, next) {
    return deepmerge(prev, next, options);
  }, {});
}
