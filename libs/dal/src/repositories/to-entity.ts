import { ClassConstructor, plainToInstance } from 'class-transformer';

/**
 * Single-pass replacement for `plainToInstance(Entity, JSON.parse(JSON.stringify(data)))`.
 *
 * The JSON round-trip and the class-transformer pass were most of the DAL's CPU time per
 * read (about 100 µs for a 9 KB workflow document). This walk produces the same output in
 * one pass:
 *
 * - JSON rules: `toJSON()` is called when present (ObjectId, Date, Mongoose documents and
 *   Maps, Buffer), `undefined` / functions / symbols are dropped from objects and become
 *   `null` in arrays, NaN and ±Infinity become `null`, -0 becomes 0, only own enumerable
 *   string keys are copied in `Object.keys` order, and BigInt values and cycles throw.
 * - class-transformer rules (entity mode only): the root object, and every object in a root
 *   array, gets the entity prototype; nested objects stay plain. Keys that class-transformer
 *   skips are skipped too: `__proto__`, `constructor`, and any key found on the target
 *   prototype chain (for nested objects that is `Object.prototype`, e.g. `toString`).
 *
 * Entity classes with plain-to-class class-transformer metadata (`@Type`, `@Transform`,
 * `@Expose`, or an `@Exclude` that is not `toPlainOnly`), constructor-assigned fields or
 * accessors fall back to the original two-step path.
 *
 * Objects with fewer than 128 keys are built with `defineProperty` so they stay in V8 fast mode,
 * as JSON.parse's objects do; see `JSON_PARSE_FAST_KEY_LIMIT`.
 *
 * One intentional difference: class-transformer throws on a nested object with a truthy
 * own `constructor` key; this walk drops the key like it does for falsy values.
 */

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const OMIT = Symbol('omit');
type Walked = JsonValue | typeof OMIT;

const OBJECT_PROTOTYPE = Object.prototype;

/**
 * Copies `JSON.parse(JSON.stringify(value))` without building the intermediate string.
 */
export function toJsonPlain<T = JsonValue>(value: unknown): T;
export function toJsonPlain(value: unknown): JsonValue {
  return unwrapRoot(walk('', value, [], undefined));
}

/**
 * Same output as `plainToInstance(entityClass, JSON.parse(JSON.stringify(data)))`.
 */
export function toEntity<T>(entityClass: ClassConstructor<T>, data: unknown[]): T[];
export function toEntity<T>(entityClass: ClassConstructor<T>, data: unknown): T;
export function toEntity<T>(entityClass: ClassConstructor<T>, data: unknown): T | T[] {
  if (!canSkipClassTransformer(entityClass)) {
    return plainToInstance(entityClass, JSON.parse(JSON.stringify(data)));
  }

  // The walk gave every object at an entity position the entity's prototype.
  return unwrapRoot(walk('', data, [], entityClass.prototype)) as T | T[];
}

/**
 * `JSON.stringify` returns `undefined` for an omitted root and `JSON.parse(undefined)` throws.
 */
function unwrapRoot(result: Walked): JsonValue {
  if (result === OMIT) {
    throw new SyntaxError('"undefined" is not valid JSON');
  }

  return result;
}

/**
 * @param target `undefined` for plain JSON; otherwise the prototype class-transformer would
 * give an object at this position (`Object.prototype` for nested objects).
 */
function walk(key: string | number, value: unknown, stack: object[], target: object | undefined): Walked {
  if (hasToJSON(value)) {
    return walkValue(value.toJSON(typeof key === 'number' ? String(key) : key), stack, target);
  }

  return walkValue(value, stack, target);
}

function hasToJSON(value: unknown): value is { toJSON: (key: string) => unknown } {
  return (
    value !== null &&
    (typeof value === 'object' || typeof value === 'bigint') &&
    typeof (value as { toJSON?: unknown }).toJSON === 'function'
  );
}

function walkValue(value: unknown, stack: object[], target: object | undefined): Walked {
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return value;
    case 'number':
      return toJsonNumber(value);
    case 'object':
      return value === null ? null : walkObject(value, stack, target);
    case 'bigint':
      throw new TypeError('Do not know how to serialize a BigInt');
    default:
      return OMIT;
  }
}

function toJsonNumber(value: number): number | null {
  return Number.isFinite(value) ? value + 0 : null;
}

function walkObject(value: object, stack: object[], target: object | undefined): Walked {
  if (value.constructor !== Object && !Array.isArray(value)) {
    const primitive = unwrapPrimitive(value);
    if (primitive !== OMIT) {
      return primitive;
    }
  }

  if (stack.includes(value)) {
    throw new TypeError('Converting circular structure to JSON');
  }
  stack.push(value);

  let out: JsonValue;
  if (Array.isArray(value)) {
    out = walkArray(value, stack, target);
  } else if (target === undefined) {
    out = walkJsonObject(value as Record<string, unknown>, stack);
  } else {
    out = walkEntityObject(value as Record<string, unknown>, stack, target);
  }

  stack.pop();

  return out;
}

/**
 * JSON.parse keeps objects with fewer keys than this in V8 fast (hidden-class) mode and puts
 * larger ones in dictionary mode. Below the limit fields are added with `defineProperty`: V8
 * moves an object to dictionary mode after about 20 computed-key assignments (`out[key] = v`),
 * which costs several times the memory and makes reads slower. At or above the limit plain
 * assignment gives the same dictionary-mode object JSON.parse does, without creating a hidden
 * class for every distinct key set (large `Mixed` payloads).
 */
const JSON_PARSE_FAST_KEY_LIMIT = 128;

function defineField(out: object, key: string, value: JsonValue): void {
  Object.defineProperty(out, key, { value, writable: true, enumerable: true, configurable: true });
}

function walkArray(value: unknown[], stack: object[], target: object | undefined): JsonValue[] {
  const out: JsonValue[] = [];
  const length = value.length;
  for (let i = 0; i < length; i++) {
    // plainToInstance applies the entity class to every element of a root array, nested arrays included.
    const item = walk(i, value[i], stack, target);
    out.push(item === OMIT ? null : item);
  }

  return out;
}

function walkJsonObject(value: Record<string, unknown>, stack: object[]): { [key: string]: JsonValue } {
  const out: { [key: string]: JsonValue } = {};
  const keys = Object.keys(value);
  const compact = keys.length < JSON_PARSE_FAST_KEY_LIMIT;
  for (const key of keys) {
    const item = walk(key, value[key], stack, undefined);
    if (item === OMIT) continue;

    // `defineProperty` also keeps an own `__proto__` key as a data property, as JSON.parse does.
    if (compact || key === '__proto__') {
      defineField(out, key, item);
    } else {
      out[key] = item;
    }
  }

  return out;
}

function walkEntityObject(
  value: Record<string, unknown>,
  stack: object[],
  target: object
): { [key: string]: JsonValue } {
  const out: { [key: string]: JsonValue } = target === OBJECT_PROTOTYPE ? {} : Object.create(target);
  const keys = Object.keys(value);
  const compact = keys.length < JSON_PARSE_FAST_KEY_LIMIT;
  for (const key of keys) {
    const item = walk(key, value[key], stack, OBJECT_PROTOTYPE);
    // class-transformer skips `__proto__`, `constructor` and keys that the new instance already inherits.
    if (item === OMIT || key in target) continue;

    if (compact) {
      defineField(out, key, item);
    } else {
      out[key] = item;
    }
  }

  return out;
}

/**
 * JSON serializes Number, String, Boolean and BigInt wrapper objects as their primitive.
 */
function unwrapPrimitive(value: object): Walked {
  if (value instanceof Number) return toJsonNumber(Number(value));
  if (value instanceof String) return String(value);
  if (value instanceof Boolean) return value.valueOf();
  if (Object.prototype.toString.call(value) === '[object BigInt]') {
    throw new TypeError('Do not know how to serialize a BigInt');
  }

  return OMIT;
}

const eligibility = new WeakMap<object, boolean>();

/**
 * True when `Object.create(Entity.prototype)` plus the walk above gives the same result as
 * class-transformer: no plain-to-class metadata, an empty instance, and a prototype chain
 * that only holds methods. Computed once per class.
 */
export function canSkipClassTransformer(entityClass: ClassConstructor<unknown>): boolean {
  let eligible = eligibility.get(entityClass);
  if (eligible === undefined) {
    eligible =
      !hasPlainToClassMetadata(entityClass) && hasEmptyInstance(entityClass) && hasOnlyMethods(entityClass.prototype);
    eligibility.set(entityClass, eligible);
  }

  return eligible;
}

type DecoratorMetadata = { options?: { toPlainOnly?: boolean } };

interface ClassTransformerStorage {
  _typeMetadatas: Map<unknown, Map<string, unknown>>;
  _transformMetadatas: Map<unknown, Map<string, DecoratorMetadata[]>>;
  _exposeMetadatas: Map<unknown, Map<string | undefined, DecoratorMetadata>>;
  _excludeMetadatas: Map<unknown, Map<string | undefined, DecoratorMetadata>>;
}

function loadMetadataStorage(): ClassTransformerStorage | undefined {
  try {
    // class-transformer has no public API to list a class's metadata; read its storage maps.
    // biome-ignore lint/style/noCommonJs: the storage module is not in class-transformer's typed entry point
    const storageModule = require('class-transformer/cjs/storage');
    const storage: Partial<ClassTransformerStorage> | undefined = storageModule.defaultMetadataStorage;
    const maps = [
      storage?._typeMetadatas,
      storage?._transformMetadatas,
      storage?._exposeMetadatas,
      storage?._excludeMetadatas,
    ];

    return maps.every((map) => map instanceof Map) ? (storage as ClassTransformerStorage) : undefined;
  } catch {
    return undefined;
  }
}

const appliesToClass = (metadata: DecoratorMetadata) => !metadata.options?.toPlainOnly;

function hasOwnPlainToClassMetadata(storage: ClassTransformerStorage, target: unknown): boolean {
  if (storage._typeMetadatas.get(target)?.size) return true;

  const transforms = [...(storage._transformMetadatas.get(target)?.values() ?? [])].flat();
  const exposes = [...(storage._exposeMetadatas.get(target)?.values() ?? [])];
  const excludes = [...(storage._excludeMetadatas.get(target)?.values() ?? [])];

  return [...transforms, ...exposes, ...excludes].some(appliesToClass);
}

/**
 * Any metadata that plainToInstance would act on, on the class or its ancestors.
 * Fails closed: if the storage can't be read, the class keeps the class-transformer path.
 */
export function hasPlainToClassMetadata(entityClass: ClassConstructor<unknown>): boolean {
  const storage = loadMetadataStorage();
  if (!storage) return true;

  for (
    let target: unknown = entityClass;
    typeof target === 'function' && target !== Function.prototype;
    target = Object.getPrototypeOf(target)
  ) {
    if (hasOwnPlainToClassMetadata(storage, target)) return true;
  }

  return false;
}

function hasEmptyInstance(entityClass: ClassConstructor<unknown>): boolean {
  try {
    return Reflect.ownKeys(new entityClass() as object).length === 0;
  } catch {
    return false;
  }
}

function hasOnlyMethods(prototype: object): boolean {
  for (let current: object | null = prototype; current !== OBJECT_PROTOTYPE; current = Object.getPrototypeOf(current)) {
    if (current === null) return false;

    const onlyMethods = Reflect.ownKeys(current).every((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(current, key);

      return descriptor !== undefined && 'value' in descriptor && typeof descriptor.value === 'function';
    });
    if (!onlyMethods) return false;
  }

  return true;
}
