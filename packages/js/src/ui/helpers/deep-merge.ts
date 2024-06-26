type AnyObject = Record<string, any>;

export function deepMerge<T extends AnyObject, U extends AnyObject>(target: T, source: U): T & U {
  const output: AnyObject = { ...target };

  Object.keys(source).forEach((key) => {
    if (isObject(source[key])) {
      if (key in target && isObject(target[key])) {
        output[key] = deepMerge(target[key], source[key]);
      } else {
        // Directly assign a deep clone of the source if target doesn't have this key as an object
        output[key] = deepMerge({}, source[key]);
      }
    } else {
      output[key] = source[key];
    }
  });

  return output as T & U;
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}
