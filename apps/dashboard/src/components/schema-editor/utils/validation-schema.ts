import { z } from 'zod';

// Defines the structure of the value/definition of a property
const baseJsonSchema: z.ZodType<any> = z
  .object({
    type: z
      .union([
        z.literal('string'),
        z.literal('number'),
        z.literal('integer'),
        z.literal('object'),
        z.literal('array'),
        z.literal('boolean'),
        z.literal('null'),
      ])
      .optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    // String specific
    minLength: z.number().int().nonnegative().optional(),
    maxLength: z.number().int().nonnegative().optional(),
    pattern: z.string().optional(),
    format: z.string().optional(),
    // Number/Integer specific
    minimum: z.number().optional(),
    maximum: z.number().optional(),
    exclusiveMinimum: z.number().optional(),
    exclusiveMaximum: z.number().optional(),
    multipleOf: z.number().positive().optional(),
    // Enum
    enum: z.array(z.string().min(1, { message: 'Enum choice value cannot be empty.' })).optional(),
    // Default value
    default: z.any().optional(),
    examples: z.array(z.any()).optional(),
    deprecated: z.boolean().optional(),
    readOnly: z.boolean().optional(),
    writeOnly: z.boolean().optional(),

    // For type 'object': properties will be managed by a nested propertyList
    // This field (`propertyList`) is our internal representation for editing object properties.
    // The actual `properties` field of JSONSchema7 is constructed on output.
    propertyList: z.array(z.lazy(() => PropertyListItemSchema)).optional(),

    // For type 'array': items schema
    items: z.lazy(() => baseJsonSchema.optional()), // Can be a single schema
    minItems: z.number().int().nonnegative().optional(),
    maxItems: z.number().int().nonnegative().optional(),
    uniqueItems: z.boolean().optional(),

    // Allow other valid JSON Schema keywords by not strictly parsing them out here
    // but they should be part of JSONSchema7 type if used.
  })
  .catchall(z.any()); // Allow any other keywords not explicitly defined

// Defines an item in our editable property list
const PropertyListItemSchema = z.object({
  id: z.uuid(),
  keyName: z
    .string()
    .min(1, { message: 'Property name is required.' })
    .refine(
      (val) => {
        // For non-empty strings, enforce proper naming rules
        return /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(val);
      },
      {
        message:
          'Name must start with a letter or underscore, and contain only letters, numbers, underscores, or hyphens.',
      }
    ),
  definition: baseJsonSchema,
  isRequired: z.boolean().optional(),
  isNullable: z.boolean().optional(),
});
export type PropertyListItem = z.infer<typeof PropertyListItemSchema>;

// This is the overall shape of the form data for the SchemaEditor
export const SchemaEditorFormValuesSchema = z.object({
  propertyList: z.array(PropertyListItemSchema).superRefine((list, ctx) => {
    // Check for unique keyNames among properties
    const names = new Set<string>();
    list.forEach((item, index) => {
      // Since keyNames are now required to be non-empty, check all for uniqueness
      if (names.has(item.keyName)) {
        ctx.addIssue({
          path: [index, 'keyName'], // Path to the specific duplicate keyName field
          message: 'Property name must be unique.',
          code: z.ZodIssueCode.custom,
        });
      }

      names.add(item.keyName);
    });
  }),
});

export type SchemaEditorFormValues = z.infer<typeof SchemaEditorFormValuesSchema>;

export const editorSchema = SchemaEditorFormValuesSchema;
