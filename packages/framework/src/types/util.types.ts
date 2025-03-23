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
export type ConditionalPartial<T extends Obj, Condition extends boolean> = T extends Obj
  ? Condition extends true
    ? Partial<T>
    : T
  : never;

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

// https://github.com/type-challenges/type-challenges/issues/737
/**
 * Convert union type T to an intersection type.
 */
type UnionToIntersection<T> = (T extends unknown ? (x: T) => unknown : never) extends (x: infer U) => unknown
  ? U
  : never;

/*
 * Get the last union type in a union T.
 *
 * ((x: A) => unknown) & ((x: B) => unknown) is overloaded function then Conditional types are inferred only from the last overload
 * @see https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html#type-inference-in-conditional-types
 *
 *
 * @example
 * ```ts
 * type Test = LastUnion<1 | 2>; // => 2
 * ```
 */
type LastUnion<T> =
  UnionToIntersection<T extends unknown ? (x: T) => unknown : never> extends (x: infer L) => unknown ? L : never;

/**
 * Convert a union type to a tuple.
 */
export type UnionToTuple<T, Last = LastUnion<T>> = [T] extends [never] ? [] : [...UnionToTuple<Exclude<T, Last>>, Last];

/**
 * Stringify type T to a string. Useful for error messages.
 *
 * Each built-in type is exhaustively handled to produce a string representation.
 *
 * @example
 * ```ts
 * type Test = Stringify<string>;
 * // => 'string'
 * ```
 *
 * @example
 * ```ts
 * type Test = Stringify<{ foo: string; bar?: number }>;
 * // => '{ foo: string; bar?: number }'
 * ```
 *
 * @example
 * ```ts
 * type Test = Stringify<Array<unknown>>;
 * // => 'unknown[]'
 * ```
 */
export type Stringify<T> = T extends string
  ? 'string'
  : T extends number
    ? 'number'
    : T extends boolean
      ? 'boolean'
      : T extends bigint
        ? 'bigint'
        : T extends symbol
          ? 'symbol'
          : T extends null
            ? 'null'
            : T extends undefined
              ? 'undefined'
              : T extends Array<infer U>
                ? `${Stringify<U>}[]`
                : T extends Obj
                  ? `{${DeepStringifyObject<T>}}`
                  : T extends unknown
                    ? 'unknown'
                    : // Fallback to `never` for unknown types
                      'never';

/**
 * Known types that can be used to stringify a type.
 */
type KnownTypes = string | number | boolean | bigint | symbol | undefined | null | Array<unknown> | Obj;

/**
 * Check if T is a dictionary type.
 *
 * @example
 * ```ts
 * type Test1 = IsDictionary<Record<string, string>>; // true
 * type Test2 = IsDictionary<Record<string, unknown>>; // true
 * type Test3 = IsDictionary<{ [x: string]: string }>; // true
 * type Test4 = IsDictionary<{ [x: string]: unknown }>; // true
 * type Test5 = IsDictionary<{ foo: string }>; // false
 * ```
 */
type IsDictionary<T> = string extends keyof T ? true : false;

/**
 * The key used when the key is for a dictionary type.
 */
type UnknownKey = '[x: string]';

/**
 * Stringify the properties of a record type.
 */
type DeepStringifyObject<T extends Obj> =
  // If T has no keys, return an empty string
  keyof T extends never
    ? ''
    : // Convert the keys of T into a tuple and destructure it into the first key (U) and the rest (Rest)
      UnionToTuple<keyof T> extends [infer U, ...infer Rest]
      ? ` ${
          // If U is a string, construct the string representation of the key-value pair
          U extends keyof T & string
            ? `${
                // Build the key. If T is a dictionary, use "[key: string]" as the key. Otherwise, use the key directly.
                IsDictionary<T> extends true ? UnknownKey : U
              }${
                // Build the optional "?" indicator. Check if the value extends undefined
                undefined extends T[U]
                  ? // Check if the value extends a known type
                    T[U] extends KnownTypes
                    ? // If the value extends a known type, add a "?" to the end of the key
                      '?'
                    : // Otherwise, the value is not a known type (i.e. `unknown`), so we don't add a "?"
                      ''
                  : // The value didn't extend undefined, so no "?" is needed
                    ''
              }: ${
                // Build the value.
                T[U] extends never
                  ? // If the value is `never`, return `never`
                    'never'
                  : // Otherwise, stringify the value, excluding undefined if necessary
                    Stringify<
                      // Check if the value is optional
                      Exclude<T[U], undefined> extends never
                        ? // If the value was explicitly undefined, return undefined
                          undefined
                        : // Otherwise, remove undefined from the type as it's already handled with the "?"
                          Exclude<T[U], undefined>
                    >
              };${
                // Add a space if there are no more keys to process in the object
                Rest extends [] ? ' ' : ''
              }`
            : ''
        }${
          // Recursively process the rest of the keys, excluding string, number, and symbol to handle cases like `{ [x: string]: unknown }` whose keys are `string | number`
          DeepStringifyObject<Omit<T, U & (string | number | symbol)>>
        }`
      : never;
