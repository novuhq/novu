export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type PrettifyNested<T> = {
  [K in keyof T]: PrettifyNested<T[K]>;
} & {};
