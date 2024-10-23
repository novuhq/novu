export type CustomDataType = { [key: string]: string | string[] | boolean | number | undefined };

/**
 * Recursively make all properties of type `T` optional.
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;
