export type Passthrough = {
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  query?: Record<string, string>;
};

export type WithPassthrough<T> = Prettify<T & { _passthrough?: Passthrough }>;

/**
 * A type that represents a type that is a prettified version of the original type.
 * The prettified type has all generics removed from intellisense and displays a flat object.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export type Prettify<T> = { [K in keyof T]: T[K] } & {};
