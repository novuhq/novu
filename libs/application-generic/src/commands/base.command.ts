import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { plainToInstance, Type } from 'class-transformer';
import { ValidationError, validateSync } from 'class-validator';

// Any class constructor, abstract or not — the key class-transformer stores metadata under.
type ClassConstructor = abstract new (...args: never[]) => unknown;

const TRANSFORMER_METADATA_MAPS = [
  '_typeMetadatas',
  '_transformMetadatas',
  '_exposeMetadatas',
  '_excludeMetadatas',
] as const;

/** The per-class maps of class-transformer's `MetadataStorage` that `skipDeepTransform` must respect. */
type TransformerMetadataMaps = ReadonlyMap<ClassConstructor, unknown>[];

/** Shape of `class-transformer/cjs/storage`, as far as this file reads it. */
type ClassTransformerStorageModule = {
  defaultMetadataStorage?: Partial<Record<(typeof TRANSFORMER_METADATA_MAPS)[number], unknown>>;
};

/** A command class; `skipDeepTransform` is the protected static opt-in on {@link BaseCommand}. */
type CommandClass = ClassConstructor & { readonly skipDeepTransform?: boolean };

/**
 * class-transformer's internal storage (`@nestjs/mapped-types` reads the same one); it ships without
 * typings. Returns null when it is missing or its shape changed, which keeps every command deep.
 */
function loadTransformerMetadataMaps(): TransformerMetadataMaps | null {
  let storageModule: ClassTransformerStorageModule;
  try {
    // biome-ignore lint/style/noCommonJs: subpath has no typings or ESM entry; the probe below guards identity
    storageModule = require('class-transformer/cjs/storage');
  } catch {
    return null;
  }

  const maps: TransformerMetadataMaps = [];
  for (const key of TRANSFORMER_METADATA_MAPS) {
    const map = storageModule.defaultMetadataStorage?.[key];
    if (!(map instanceof Map)) {
      return null;
    }
    maps.push(map);
  }

  return maps;
}

const transformerMetadataMaps = loadTransformerMetadataMaps();

/** Whether `target` or an ancestor declares @Type / @Transform / @Expose / @Exclude. Unknown → true. */
function hasTransformerMetadata(target: ClassConstructor): boolean {
  if (!transformerMetadataMaps) {
    return true;
  }

  for (let cls: ClassConstructor | null = target; cls && cls !== Function.prototype; cls = Object.getPrototypeOf(cls)) {
    const current = cls;
    if (transformerMetadataMaps.some((map) => map.has(current))) {
      return true;
    }
  }

  return false;
}

class MetadataStorageProbe {
  @Type(() => Object)
  probe?: unknown;
}

/**
 * The decorators must register in the storage we read (an ESM bundle can load a second copy of
 * class-transformer), or skip-transform detection would be blind to @Type and friends.
 */
const IS_METADATA_STORAGE_READABLE = hasTransformerMetadata(MetadataStorageProbe);

const shallowCreateByClass = new WeakMap<ClassConstructor, boolean>();

// biome-ignore lint/complexity/noStaticOnlyClass: Base class pattern for command validation
export abstract class BaseCommand {
  /**
   * Opt-in for hot-path commands that carry large entities (job, workflow, step): `create()` assigns
   * `data` onto the instance instead of deep-copying it through `plainToInstance`. Validation is
   * unchanged. The command then shares nested objects with the caller, so only opt in when no
   * consumer mutates a nested field in place — the deep copy is otherwise what keeps per-subscriber
   * writes out of shared objects such as workflows from the in-memory LRU cache.
   * Ignored (deep path) when the class uses class-transformer decorators.
   */
  protected static readonly skipDeepTransform: boolean = false;

  /**
   * @param data - Plain command fields validated via class-transformer / class-validator.
   * @param extras - Runtime objects that must not go through `plainToInstance`
   *   (e.g. Mongo `ClientSession`, `AbortSignal`). Assigned onto the instance after transform.
   *   Passing them in `data` throws (e.g. `ClientSession requires a MongoClient`).
   */
  static create<T extends BaseCommand>(this: new (...args: unknown[]) => T, data: T, extras?: Partial<T>): T {
    // biome-ignore lint/complexity/noThisInStatic: Biome linter is configured to newer JS/TS version than the compiler
    const convertedObject = isShallowCreate(this)
      ? // biome-ignore lint/complexity/noThisInStatic: Biome linter is configured to newer JS/TS version than the compiler
        Object.assign(new this(), data)
      : // biome-ignore lint/complexity/noThisInStatic: Biome linter is configured to newer JS/TS version than the compiler
        plainToInstance<T, unknown>(this, {
          ...data,
        });

    const errors = validateSync(convertedObject, { forbidUnknownValues: false });
    const flattenedErrors = flattenErrors(errors);
    if (Object.keys(flattenedErrors).length > 0) {
      // biome-ignore lint/complexity/noThisInStatic: Biome linter is configured to newer JS/TS version than the compiler
      throw new CommandValidationException(this.name, flattenedErrors);
    }

    if (extras) {
      Object.assign(convertedObject, extras);
    }

    return convertedObject;
  }
}

function isShallowCreate(target: CommandClass): boolean {
  let shallow = shallowCreateByClass.get(target);
  if (shallow === undefined) {
    shallow = target.skipDeepTransform === true && IS_METADATA_STORAGE_READABLE && !hasTransformerMetadata(target);
    shallowCreateByClass.set(target, shallow);
  }

  return shallow;
}

export class ConstraintValidation {
  @ApiProperty({
    type: 'array',
    items: { type: 'string' },
    description: 'List of validation error messages',
    example: ['Field is required', 'Invalid format'],
  })
  messages: string[];

  @ApiProperty({
    required: false,
    description: 'Value that failed validation',
    oneOf: [
      { type: 'string', nullable: true },
      { type: 'number' },
      { type: 'boolean' },
      { type: 'object' },
      {
        type: 'array',
        items: {
          anyOf: [
            { type: 'string', nullable: true },
            { type: 'number' },
            { type: 'boolean' },
            { type: 'object', additionalProperties: true },
          ],
        },
      },
    ],
    example: 'xx xx xx ',
  })
  value?: string | number | boolean | object | object[] | null;
}
function flattenErrors(errors: ValidationError[], prefix: string = ''): Record<string, ConstraintValidation> {
  const result: Record<string, ConstraintValidation> = {};

  for (const error of errors) {
    const currentKey = prefix ? `${prefix}.${error.property}` : error.property;

    if (error.constraints) {
      result[currentKey] = {
        messages: Object.values(error.constraints),
        value: error.value,
      };
    }

    if (error.children && error.children.length > 0) {
      const childErrors = flattenErrors(error.children, currentKey);
      for (const [key, value] of Object.entries(childErrors)) {
        if (result[key]) {
          result[key].messages = result[key].messages.concat(value.messages);
        } else {
          result[key] = value;
        }
      }
    }
  }

  return result;
}
export class CommandValidationException extends BadRequestException {
  constructor(
    public className: string,
    public constraintsViolated: Record<string, ConstraintValidation>
  ) {
    const message = formatValidationMessage(className, constraintsViolated);
    super({ message, className, constraintsViolated });
  }
}

function formatValidationMessage(className: string, constraints: Record<string, ConstraintValidation>): string {
  const details = Object.entries(constraints)
    .map(([field, constraint]) => `${field}: ${constraint.messages.join(', ')}`)
    .join('; ');

  return `Validation failed for ${className}: ${details}`;
}
