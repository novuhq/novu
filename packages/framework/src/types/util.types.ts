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
 * The prettified type has any generics removed from intellisense and displays a flat object.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export type Prettify<T> = { [K in keyof T]: T[K] } & {};
