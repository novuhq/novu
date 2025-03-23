import { Prettify } from '../util.types';

/**
 * A type that represents a class.
 */
export type ClassValidatorSchema<T = unknown> = new (...args: unknown[]) => T;

/**
 * Extract the properties of a class type.
 */
export type ClassPropsInfer<T extends ClassValidatorSchema> =
  T extends ClassValidatorSchema<infer R> ? Prettify<R> : never;

/**
 * Infer the data type of a ClassValidatorSchema.
 *
 * @param T - The ClassValidatorSchema to infer the data type of.
 * @param Options - Configuration options for the type inference. The `validated` flag determines whether the schema has been validated. If `validated` is true, all properties are required unless specified otherwise. If false, properties with default values are optional.
 *
 * @returns The inferred type.
 *
 * @example
 * ```ts
 * class MySchema {
 *   @IsString()
 *   @IsNotEmpty()
 *   name: string;
 *
 *   @IsEmail()
 *   @IsOptional()
 *   email?: string;
 * }
 *
 * // has type { name: string, email?: string }
 * type MySchema = InferClassValidatorSchema<typeof MySchema, { validated: true }>;
 * ```
 */
export type InferClassValidatorSchema<T, Options extends { validated: boolean }> = T extends ClassValidatorSchema
  ? keyof T extends never
    ? // Ensure that a generic schema produces never
      never
    : // Non-generic schema
      Options['validated'] extends true
      ? ClassPropsInfer<T>
      : // ClassSchema doesn't support default properties, so the resulting type
        // will not have default properties set to optional.
        ClassPropsInfer<T>
  : never;
