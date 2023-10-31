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
 * The template literal type of an ObjectKey identifier
 */
export type ObjectIdKey = `_${string}Id` | '_id';

/**
 * The templater literal type of a Date key
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
 * Transform the values of T with keys in union of type `ObjectIdKey` to type `Types.ObjectId`
 */
export type TransformEntityToDbModel<T> = TransformValues<TransformValues<T, ObjectIdKey, ObjectIdType>, DateKey, Date>;
