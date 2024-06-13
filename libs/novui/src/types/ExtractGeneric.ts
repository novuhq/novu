type TypeWithGeneric<T> = T[];

/** Extract the type 'T' from a generic type */
export type ExtractGeneric<T> = T extends TypeWithGeneric<infer X> ? X : never;
