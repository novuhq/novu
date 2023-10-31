import { Types } from 'mongoose';

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
 * Construct a type with a `.` prefixed to `T` if `T` is not an empty string
 */
export type DotPrefix<T extends string> = T extends '' ? '' : `.${T}`;

/**
 * Construct a union type from the leaf key paths in T
 *
 * The following reference specifically mentions Mongo as a use-case for the generic.
 * @see https://stackoverflow.com/a/68404823
 */
export type LeafKeys<T> = (
  T extends object
    ? { [K in Exclude<keyof T, symbol>]: `${K}${DotPrefix<LeafKeys<T[K]>>}` }[Exclude<keyof T, symbol>]
    : ''
) extends infer D
  ? Extract<D, string>
  : never;
