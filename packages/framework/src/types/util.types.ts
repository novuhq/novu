/*
 * THIS FILE SHOULD NOT DEPEND ON ANY OTHER FILES.
 * IT SHOULD ONLY CONTAIN UTILITY TYPES.
 */

/**
 * A type that represents either `A` or `B`. Shared properties retain their
 * types and unique properties are marked as optional.
 */
export type Either<A, B> = Partial<A> & Partial<B> & (A | B);

/**
 * A type that represents a value that may be a promise or a regular value.
 */
export type Awaitable<T> = T | Promise<T>;

/**
 * A type that represents a type that is a prettified version of the original type.
 * The prettified type has all generics removed from intellisense and displays a flat object.
 */

export type Prettify<T> = { [K in keyof T]: T[K] } & {};

/**
 * Mark properties of T as optional if Condition is true
 */
export type ConditionalPartial<T extends Obj, Condition extends boolean> = Condition extends true ? Partial<T> : T;

/**
 * Same as Nullable except without `null`.
 */
type Optional<T> = T | undefined;

/**
 * Types that can be used to index native JavaScript types, (Object, Array, etc.).
 */
type IndexSignature = string | number | symbol;

/**
 * An object of any index-able type to avoid conflicts between `{}`, `Record`, `object`, etc.
 */
type Obj<O extends Record<IndexSignature, unknown> | object = Record<IndexSignature, unknown> | object> = {
  [K in keyof O as K extends never ? never : K]: K extends never ? never : O[K] extends never ? never : O[K];
} & Omit<O, never>;

/**
 * Any type that is indexable using `string`, `number`, or `symbol`.
 */
export type Indexable<ValueTypes = unknown> =
  | {
      [K: IndexSignature]: ValueTypes;
    }
  | Obj;

/**
 * Picks only the optional properties from a type, removing the required ones.
 * Optionally, recurses through nested objects if `DEEP` is true.
 */
export type PickOptional<T, DEEP extends boolean = true> = {
  /*
   * `DEEP` must be false b/c `never` interferes with root level objects with both optional/required properties
   * If `undefined` extends the type of the value, it's optional (e.g. `undefined extends string | undefined`)
   */
  [K in keyof T as undefined extends T[K] ? K : never]: DEEP extends false
    ? T[K]
    : T[K] extends Optional<Indexable> // Like above, we must include `undefined` so we can recurse through both nested keys in `{ myKey?: { optionalKey?: object, requiredKey: object }}`
      ? PickOptional<T[K], DEEP>
      : T[K];
};

/**
 * Picks only the required fields out of a type, removing the optional ones.
 * Optionally, recurses through nested objects if `DEEP` is true.
 */
export type PickRequired<T, DEEP extends boolean = true> = {
  [K in keyof T as K extends keyof PickOptional<T, DEEP> ? never : K]: T[K] extends Indexable
    ? PickRequired<T[K], DEEP>
    : T[K];
};

/**
 * Picks only the required keys out of a type, removing the optional ones.
 * Optionally, recurses through nested objects if `DEEP` is true.
 */
export type PickRequiredKeys<T, DEEP extends boolean = true> = keyof PickRequired<T, DEEP>;

/**
 * Picks only the optional keys out of a type, removing the required ones.
 * Optionally, recurses through nested objects if `DEEP` is true.
 */
export type PickOptionalKeys<T, DEEP extends boolean = true> = keyof PickOptional<T, DEEP>;

/**
 * Recursively make all properties of type `T` optional.
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

/**
 * Recursively make all properties of type `T` required.
 */
export type DeepRequired<T> = T extends object
  ? {
      [P in keyof T]-?: DeepRequired<T[P]>;
    }
  : T;
