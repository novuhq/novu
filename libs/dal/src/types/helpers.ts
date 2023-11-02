import { Types } from 'mongoose';
import { UserEntity } from '../repositories/user';
import { AuthProviderEnum } from 'libs/shared/dist/cjs';

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
 * The type union of the PK identifier and the template literal type of an FK identifier
 */
export type ObjectIdKey = '_id' | `_${string}Id`;

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
 * Construct a type with the following transforms applied to type T:
 * - Tranform values of T with keys in union of type `ObjectIdKey` to type `Types.ObjectId`
 * - Tranform values of T with keys in union of type `DateKey` to type `Date`
 */
export type TransformEntityToDbModel<T> = TransformValues<TransformValues<T, ObjectIdKey, ObjectIdType>, DateKey, Date>;

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
export type DeepKeys<T> = T extends StopTypes
  ? never
  : T extends readonly unknown[]
  ? DeepKeys<T[number]>
  : {
      [K in keyof T & string]: T[K] extends StopTypes ? K : Dot<K, DeepKeys<T[K]>> | K;
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

export type FlatKeys<T> = {
  [Key in DeepKeys<T>]: ExtractDot<T, Key>;
};

const partialDotNotedOrg: Partial<FlatKeys<UserEntity>> = {
  'resetTokenCount.reqInDay': 1,
  'tokens.provider': AuthProviderEnum.GITHUB,
  'servicesHashes.intercom': '123',
};
