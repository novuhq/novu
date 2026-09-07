export type Passthrough = {
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  query?: Record<string, string>;
};

export type WithPassthrough<T> = T & { _passthrough?: Passthrough };
