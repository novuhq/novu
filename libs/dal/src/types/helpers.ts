import { Types } from 'mongoose';
import { IEntity } from './base.entity';

/**
 * The type of an ObjectKey identifier.
 * This is the type of the `_id` field in a Mongoose document
 *
 * This is intentionally type widened to `string` to cater for
 * cases where the `_id` field is a string instead of a `Types.ObjectId`
 * TODO: Investigate and decide on approach to choose either `Types.ObjectId` or `string`
 *
 * @see https://mongoosejs.com/docs/schematypes.html#objectids
 */
export type ObjectIdType = Types.ObjectId | string;

/**
 * The type of a PK ObjectKey identifier.
 */
export type ObjectIdPrimaryKey = '_id';

/**
 * The template literal type of an FK ObjectKey identifier
 */
export type ObjectIdForeignKey = `_${string}Id`;

/**
 * The type union of the Primary and Foreign Key ObjectKey identifiers
 */
export type ObjectIdKey = ObjectIdPrimaryKey | ObjectIdForeignKey;

/**
 * The template literal type of a Date key
 */
export type DateKey = `${string}At`;

/**
 * Flatten type T to make it easier to read
 */
export type Identity<T> = { [P in keyof T]: T[P] };

/**
 * Transform the values of T with keys in union of type U to type V
 */
export type TransformValues<T, U, V> = Identity<
  Omit<T, Extract<keyof T, U>> & {
    [P in keyof Pick<T, Extract<keyof T, U>>]: V;
  }
>;

/**
 * Construct a type with the following transforms applied to type TObject:
 * - Tranform values of TObject with keys of type `ObjectIdKey` to type `Types.ObjectId`
 * - Tranform values of TObject with keys of type `DateKey` to type `Date`
 */
export type TransformEntityToDbModel<TObject extends IEntity> = TransformValues<
  TransformValues<TObject, ObjectIdKey, ObjectIdType>,
  DateKey,
  Date
>;

/**
 * Types that should stop the recursion of the deep keys.
 */
type StopTypes = number | string | boolean | symbol | bigint | Date;

/**
 * Construct a template literal type with `.` joining T and U if U is not an empty string
 */
export type Dot<T extends string, U extends string> = '' extends U ? T : `${T}.${U}`;

/**
 * Construct a type union from the key paths in T.
 *
 * Array objects are flattened to their item keys.
 *
 * @example
 * type TestNestedObject = {
 *   name: string;
 *   address?: {
 *     suburb: boolean;
 *   };
 *   phones: Array<{
 *     mobile: number;
 *   }>;
 * };
 * type Test = FlattenedLeafKeys<TestNestedObject>;
 * // type Test = "name" | "address" | "address.suburb" | "phones" | "phones.mobile"
 */
export type DeepKeys<T> =
  // If type is a primitive, stop recursing
  T extends StopTypes
    ? // Fallback for types not in StopTypes. These will not be included in the union.
      never
    : // Check if the value of the key is an array
    T extends readonly unknown[]
    ? // If we have an array, recurse into the array type. This allows us to flatten the array
      DeepKeys<T[number]>
    : // Else, we don't have an array or StopTypes, so we recurse into the object type
      {
        // For each key in the object, check if the value is in StopTypes
        [K in keyof T & string]: T[K] extends StopTypes
          ? // If we have reached a stoptype, return the key
            K
          : // Else, recurse into the object type and return the union of the key and the result of the recursion
            Dot<K, DeepKeys<T[K]>> | K;
      }[keyof T & string];

/**
 * Extract the type of TObject at TPath by dot notation
 */
export type ExtractDot<
  TObject,
  TPath extends DeepKeys<TObject>,
  /*
   * The objects that we recurse into. Constrained to `Required` so we don't
   * need to check for optional properties when accessing the object
   */
  TReqObject = Required<TObject>
> =
  /*
   * Check if the path contains a dot and infer the types.
   * Constraining TKey so we don't need to check if it is keyof TObject
   */
  TPath extends `${infer TKey extends keyof TReqObject & string}.${infer TRest}`
    ? // Check if the value of the key is an array
      TReqObject[TKey] extends readonly unknown[]
      ? // If the value is an array, recurse into the array type. This allows us to flatten the array
        TRest extends DeepKeys<TReqObject[TKey][number]>
        ? // Constraining the array object to the required type for array object access
          ExtractDot<TReqObject[TKey][number], TRest>
        : never
      : // Else the value is not an array, recurse into the object type
      TRest extends DeepKeys<TReqObject[TKey]>
      ? // Constraining the object to the required type for object access
        ExtractDot<TReqObject[TKey], TRest>
      : never
    : // Else we have arrived at a leaf. Check if the key exists in the object
    TPath extends keyof TReqObject
    ? TReqObject[TPath]
    : // Else the key does not exist, return never.
      never;

export type NestedDotKeys<T> = {
  [Key in DeepKeys<T>]: ExtractDot<T, Key>;
};
