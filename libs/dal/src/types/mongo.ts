import { Condition } from 'mongoose';

import { LeafKeys } from './helpers';

/**
 * Modified from original Mongoose typings to introduce stricter typing
 * for the `FilterQuery` generic type
 *
 * @see https://github.com/Automattic/mongoose/blob/582156858db3ca7fbaa8950dc997e0d9e8117b21/types/query.d.ts#L70
 */
type RootQuerySelector<T> = {
  /** @see https://www.mongodb.com/docs/manual/reference/operator/query/and/#op._S_and */
  $and?: Array<FilterQuery<T>>;
  /** @see https://www.mongodb.com/docs/manual/reference/operator/query/nor/#op._S_nor */
  $nor?: Array<FilterQuery<T>>;
  /** @see https://www.mongodb.com/docs/manual/reference/operator/query/or/#op._S_or */
  $or?: Array<FilterQuery<T>>;
  /** @see https://www.mongodb.com/docs/manual/reference/operator/query/text */
  $text?: {
    $search: string;
    $language?: string;
    $caseSensitive?: boolean;
    $diacriticSensitive?: boolean;
  };
  /** @see https://www.mongodb.com/docs/manual/reference/operator/query/where/#op._S_where */
  $where?: string;
  /** @see https://www.mongodb.com/docs/manual/reference/operator/query/comment/#op._S_comment */
  $comment?: string;
} & Partial<{
  [Key in LeafKeys<T>]: T[Key];
}>;

/**
 * Re-exporting the original typing with the new RootQuerySelector applied
 *
 * @see https://github.com/Automattic/mongoose/blob/582156858db3ca7fbaa8950dc997e0d9e8117b21/types/query.d.ts#L7
 */
export type FilterQuery<T> = {
  [P in keyof T]?: Condition<T[P]>;
} & RootQuerySelector<T>;

/**
 * Modified from original Mongoose typings to introduce stricter typing
 * for the `UpdateQuery` generic type
 *
 * @see https://github.com/Automattic/mongoose/blob/582156858db3ca7fbaa8950dc997e0d9e8117b21/types/index.d.ts#L598
 */
export type UpdateQuery<TSchema> = {
  /** @see https://www.mongodb.com/docs/manual/reference/operator/update-field/ */
  $currentDate?: Partial<TSchema>;
  $inc?: Partial<TSchema>;
  $min?: Partial<TSchema>;
  $max?: Partial<TSchema>;
  $mul?: Partial<TSchema>;
  $rename?: Record<keyof TSchema, string>;
  $set?: Partial<TSchema>;
  $setOnInsert?: Partial<TSchema>;
  $unset?: Partial<TSchema>;

  /** @see https://www.mongodb.com/docs/manual/reference/operator/update-array/ */
  $addToSet?: Partial<TSchema>;
  $pop?: Partial<TSchema>;
  $pull?: Partial<TSchema>;
  $push?: Partial<TSchema>;
  $pullAll?: Partial<TSchema>;

  /** @see https://www.mongodb.com/docs/manual/reference/operator/update-bitwise/ */
  $bit?: Partial<TSchema>;
};
