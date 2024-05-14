/**
 * A type that represents either `A` or `B`. Shared properties retain their
 * types and unique properties are marked as optional.
 */
export type Either<A, B> = Partial<A> & Partial<B> & (A | B);

/**
 * A type that represents a value that may be a promise or a regular value.
 */
export type MaybePromise<T> = T | Promise<T>;
