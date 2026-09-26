import { isDeepStrictEqual } from 'node:util';
import { BadRequestException, Logger } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { defaultMetadataStorage } from 'class-transformer/cjs/storage';
import { ValidationError, validateSync } from 'class-validator';

type CommandConstructor<T> = new (...args: unknown[]) => T;
type ClassLike = abstract new (...args: never[]) => unknown;

/**
 * Controls how `BaseCommand.create` instantiates commands, via `NOVU_COMMAND_FAST_PATH`:
 * - `off` (default): always `plainToInstance` (legacy, deep-copies every nested value).
 * - `on`: copy own data properties onto `new Command()` for commands without class-transformer
 *   decorators (`@Type`, `@Transform`, `@Expose`, `@Exclude`); decorated commands keep `plainToInstance`.
 * - `shadow`: runs both paths, returns the legacy result, logs a warning on mismatch.
 * - `shadow-strict`: like `shadow` but throws on mismatch. Intended for e2e suites.
 */
type CommandFastPathMode = 'off' | 'on' | 'shadow' | 'shadow-strict';

const FAST_PATH_ENV_VAR = 'NOVU_COMMAND_FAST_PATH';
const fastPathLogger = new Logger('BaseCommand');
const requiresClassTransformerCache = new WeakMap<ClassLike, boolean>();

interface MetadataStorageInternals {
  _typeMetadatas?: Map<ClassLike, unknown>;
  _transformMetadatas?: Map<ClassLike, unknown>;
  _exposeMetadatas?: Map<ClassLike, unknown>;
  _excludeMetadatas?: Map<ClassLike, unknown>;
}

function resolveFastPathMode(): CommandFastPathMode {
  const raw = process.env[FAST_PATH_ENV_VAR]?.trim().toLowerCase();

  switch (raw) {
    case 'on':
    case 'true':
      return 'on';
    case 'shadow':
      return 'shadow';
    case 'shadow-strict':
      return 'shadow-strict';
    default:
      return 'off';
  }
}

/**
 * True when the command class (or any ancestor) carries class-transformer metadata,
 * meaning `plainToInstance` does observable work beyond setting the prototype.
 * Reads the storage's private maps on purpose: the public API only supports per-property lookups.
 * Fails safe to `true` (legacy path) if the storage shape is not the one we expect.
 */
export function requiresClassTransformer(target: ClassLike): boolean {
  const cached = requiresClassTransformerCache.get(target);
  if (cached !== undefined) {
    return cached;
  }

  const storage = defaultMetadataStorage as unknown as MetadataStorageInternals;
  const metadataMaps = [
    storage._typeMetadatas,
    storage._transformMetadatas,
    storage._exposeMetadatas,
    storage._excludeMetadatas,
  ];

  const isStorageShapeKnown = metadataMaps.every((map) => map instanceof Map);
  let result = !isStorageShapeKnown;

  let cursor: ClassLike | null = target;
  while (!result && cursor && cursor !== Function.prototype) {
    const current: ClassLike = cursor;
    result = metadataMaps.some((map) => map?.has(current));
    cursor = Object.getPrototypeOf(current) as ClassLike | null;
  }

  requiresClassTransformerCache.set(target, result);

  return result;
}

function instantiateWithClassTransformer<T>(target: CommandConstructor<T>, data: T): T {
  return plainToInstance<T, unknown>(target, { ...data });
}

function isUnsafeObjectKey(key: string): boolean {
  return key === '__proto__' || key === 'prototype' || key === 'constructor';
}

/**
 * Copies enumerable own data properties without `Object.assign`.
 * `Object.assign` uses [[Set]], so a `__proto__` own key (e.g. from `JSON.parse`)
 * replaces the target's [[Prototype]] and breaks `instanceof`.
 */
function assignOwnDataProperties<T extends object>(target: T, source: object | null | undefined): T {
  if (source == null || typeof source !== 'object') {
    return target;
  }

  for (const key of Object.keys(source)) {
    if (isUnsafeObjectKey(key)) {
      continue;
    }

    (target as Record<string, unknown>)[key] = (source as Record<string, unknown>)[key];
  }

  return target;
}

function instantiateWithAssign<T extends object>(target: CommandConstructor<T>, data: T): T {
  return assignOwnDataProperties(new target(), data);
}

export class CommandFastPathMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommandFastPathMismatchError';
  }
}

function findMismatchedKeys(left: object, right: object): string[] {
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const keys = new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)]);

  return [...keys].filter((key) => !isDeepStrictEqual(leftRecord[key], rightRecord[key]));
}

function instantiateInShadowMode<T extends object>(target: CommandConstructor<T>, data: T, isStrict: boolean): T {
  const legacyResult = instantiateWithClassTransformer(target, data);
  const fastResult = instantiateWithAssign(target, data);

  if (!isDeepStrictEqual(fastResult, legacyResult)) {
    const mismatchedKeys = findMismatchedKeys(fastResult, legacyResult);
    const message =
      `${FAST_PATH_ENV_VAR} shadow mismatch for ${target.name} on keys [${mismatchedKeys.join(', ')}]: ` +
      'plainToInstance and the fast path produced different commands';

    if (isStrict) {
      throw new CommandFastPathMismatchError(message);
    }

    fastPathLogger.warn(message);
  }

  return legacyResult;
}

function instantiateCommand<T extends object>(target: CommandConstructor<T>, data: T): T {
  const mode = resolveFastPathMode();

  if (mode === 'off' || requiresClassTransformer(target)) {
    return instantiateWithClassTransformer(target, data);
  }

  switch (mode) {
    case 'on':
      return instantiateWithAssign(target, data);
    case 'shadow':
      return instantiateInShadowMode(target, data, false);
    case 'shadow-strict':
      return instantiateInShadowMode(target, data, true);
    default: {
      const exhaustiveCheck: never = mode;

      throw new Error(`Unhandled ${FAST_PATH_ENV_VAR} mode: ${exhaustiveCheck}`);
    }
  }
}

// biome-ignore lint/complexity/noStaticOnlyClass: Base class pattern for command validation
export abstract class BaseCommand {
  /**
   * @param data - Plain command fields validated via class-transformer / class-validator.
   * @param extras - Runtime objects that must not go through `plainToInstance`
   *   (e.g. Mongo `ClientSession`, `AbortSignal`). Assigned onto the instance after transform.
   *   Passing them in `data` throws (e.g. `ClientSession requires a MongoClient`).
   */
  static create<T extends BaseCommand>(this: new (...args: unknown[]) => T, data: T, extras?: Partial<T>): T {
    // biome-ignore lint/complexity/noThisInStatic: Biome linter is configured to newer JS/TS version than the compiler
    const convertedObject = instantiateCommand(this, data);

    const errors = validateSync(convertedObject, { forbidUnknownValues: false });
    const flattenedErrors = flattenErrors(errors);
    if (Object.keys(flattenedErrors).length > 0) {
      // biome-ignore lint/complexity/noThisInStatic: Biome linter is configured to newer JS/TS version than the compiler
      throw new CommandValidationException(this.name, flattenedErrors);
    }

    if (extras) {
      assignOwnDataProperties(convertedObject, extras);
    }

    return convertedObject;
  }
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
