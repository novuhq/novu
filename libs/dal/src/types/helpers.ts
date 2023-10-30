import { Types } from 'mongoose';

/**
 * The template literal type of an ObjectKey identifier
 */
export type ObjectIdKey = `_${string}Id`;

/**
 * Flatten type T to make it easier to read
 */
type Id<T> = { [P in keyof T]: T[P] };

/**
 * Transform the values of T with keys in union of type U to type V
 */
export type TransformValues<T, U, V> = Id<
  Omit<T, Extract<keyof T, U>> & {
    [P in keyof Pick<T, Extract<keyof T, U>>]: V;
  }
>;

/**
 * Transform the values of T with keys in union of type `ObjectIdKey` to type `Types.ObjectId`
 */
export type ChangePropsValueType<T> = TransformValues<T, ObjectIdKey, Types.ObjectId>;
