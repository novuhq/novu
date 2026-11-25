import { useRef } from 'react';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;

export const isDeepEqual = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) {
    return true;
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => isDeepEqual(item, b[index]));
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);

    return (
      aKeys.length === bKeys.length &&
      aKeys.every((key) => Object.prototype.hasOwnProperty.call(b, key) && isDeepEqual(a[key], b[key]))
    );
  }

  return false;
};

/**
 * Returns the previous reference for as long as the value stays deep-equal, so object props written inline
 * (`subscriber={{ ... }}`) keep their identity across re-renders. Dates compare by time; functions and other class
 * instances compare by reference.
 */
export const useStableValue = <T>(value: T): T => {
  const ref = useRef(value);

  if (!isDeepEqual(ref.current, value)) {
    ref.current = value;
  }

  return ref.current;
};
