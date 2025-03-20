import { describe, expectTypeOf, it } from 'vitest';
import type {
  ConditionalPartial,
  Either,
  Awaitable,
  PickOptional,
  PickRequired,
  PickOptionalKeys,
  PickRequiredKeys,
  Prettify,
  DeepPartial,
  DeepRequired,
  Stringify,
  UnionToTuple,
} from './util.types';

describe('Either', () => {
  it('should compile when the first type is the correct type', () => {
    type TestEither = Either<{ foo: string }, { bar: number }>;
    const testEitherValid: TestEither = { foo: 'bar' };
  });

  it('should compile when the second type is the correct type', () => {
    type TestEither = Either<{ foo: string }, { bar: number }>;
    const testEitherValid: TestEither = { bar: 123 };
  });

  it('should compile when a shared property is present', () => {
    type TestEither = Either<{ foo: string }, { foo: string; bar: number }>;
    const testEitherValid: TestEither = { foo: 'bar', bar: 123 };
  });

  it('should not compile when neither type is the correct type', () => {
    type TestEither = Either<{ foo: string }, { bar: number }>;
    // @ts-expect-error - foo should be a string
    const testEitherInvalid: TestEither = { foo: 123 };
  });
});

describe('Awaitable', () => {
  it('should return a string or a promise of a string', () => {
    type TestAwaitable = Awaitable<string>;
    expectTypeOf<TestAwaitable>().toEqualTypeOf<string | Promise<string>>();
  });

  it('should not compile when a non-awaitable type has incorrect properties', () => {
    type TestAwaitable = Awaitable<{ foo: string }>;
    // @ts-expect-error - foo should be a string
    expectTypeOf<TestAwaitable>().toEqualTypeOf<{ foo: 123 }>();
  });

  it('should not compile when an awaitable type has incorrect properties', () => {
    type TestAwaitable = Awaitable<{ foo: string }>;
    // @ts-expect-error - foo should be a string
    expectTypeOf<TestAwaitable>().toEqualTypeOf<Promise<{ foo: 123 }>>();
  });
});

describe('ConditionalPartial', () => {
  it('should return an empty object when the condition is true', () => {
    type TestConditionalPartialTrue = ConditionalPartial<{ foo: string }, true>;
    expectTypeOf<TestConditionalPartialTrue>().toEqualTypeOf<{}>();
  });

  it('should return the object with the optional properties when the condition is true', () => {
    type TestConditionalPartialTrue = ConditionalPartial<{ foo: string }, true>;
    expectTypeOf<TestConditionalPartialTrue>().toEqualTypeOf<{ foo?: string }>();
  });

  it('should not compile an object with the wrong type of properties when the condition is true', () => {
    type TestConditionalPartialTrue = ConditionalPartial<{ foo: string }, true>;
    // @ts-expect-error - foo should be optional
    expectTypeOf<TestConditionalPartialTrue>().toEqualTypeOf<{ foo: 123 }>();
  });

  it('should return the object with the required properties when the condition is false', () => {
    type TestConditionalPartialFalse = ConditionalPartial<{ foo: string }, false>;
    expectTypeOf<TestConditionalPartialFalse>().toEqualTypeOf<{ foo: string }>();
  });

  it('should not compile an empty object when the condition is false', () => {
    type TestConditionalPartialFalse = ConditionalPartial<{ foo: string }, false>;
    // @ts-expect-error: 'foo' is required but missing
    expectTypeOf<TestConditionalPartialFalse>().toEqualTypeOf<{}>();
  });

  it('should not compile when the first argument is not an indexable type', () => {
    // @ts-expect-error - string is not an object
    type TestConditionalPartialFalse = ConditionalPartial<string, false>;
    expectTypeOf<TestConditionalPartialFalse>().toEqualTypeOf<never>();
  });
});

describe('PickOptional', () => {
  it('should return the optional property', () => {
    type TestPickOptional = PickOptional<{ foo?: string; bar: string }>;
    expectTypeOf<TestPickOptional>().toEqualTypeOf<{ foo?: string }>();
  });

  it('should not compile when the optional property is the wrong type', () => {
    type TestPickOptional = PickOptional<{ foo?: string; bar: string }>;
    // @ts-expect-error - foo should be a string
    expectTypeOf<TestPickOptional>().toEqualTypeOf<{ foo: 123 }>();
  });

  it('should not compile when specifying a required property', () => {
    type TestPickOptional = PickOptional<{ foo?: string; bar: string }>;
    // @ts-expect-error - bar should not be present
    expectTypeOf<TestPickOptional>().toEqualTypeOf<{ foo?: string; bar: string }>();
  });
});

describe('PickOptionalKeys', () => {
  it('should return the optional property', () => {
    type TestPickOptionalKeys = PickOptionalKeys<{ foo?: string }>;
    expectTypeOf<TestPickOptionalKeys>().toEqualTypeOf<'foo'>();
  });

  it('should return never when the object has no optional properties', () => {
    type TestPickOptionalKeys = PickOptionalKeys<{ foo: string }>;
    expectTypeOf<TestPickOptionalKeys>().toEqualTypeOf<never>();
  });
});

describe('PickRequired', () => {
  it('should return the required property', () => {
    type TestPickRequired = PickRequired<{ foo: string }>;
    expectTypeOf<TestPickRequired>().toEqualTypeOf<{ foo: string }>();
  });

  it('should not compile when the required property is the wrong type', () => {
    type TestPickRequired = PickRequired<{ foo: string }>;
    // @ts-expect-error - foo should be a string
    expectTypeOf<TestPickRequired>().toEqualTypeOf<{ foo: 123 }>();
  });

  it('should not compile when the required property is not present', () => {
    type TestPickRequired = PickRequired<{ foo: string }>;
    // @ts-expect-error - foo should be present
    expectTypeOf<TestPickRequired>().toEqualTypeOf<{}>();
  });

  it('should not compile when specifying an optional property', () => {
    type TestPickRequired = PickRequired<{ foo?: string; bar: string }>;
    // @ts-expect-error - foo should not be present
    expectTypeOf<TestPickRequired>().toEqualTypeOf<{ foo: string; bar: string }>();
  });
});

describe('PickRequiredKeys', () => {
  it('should return the required property', () => {
    type TestPickRequiredKeys = PickRequiredKeys<{ foo: string }>;
    expectTypeOf<TestPickRequiredKeys>().toEqualTypeOf<'foo'>();
  });

  it('should return never when the object has no required properties', () => {
    type TestPickRequiredKeys = PickRequiredKeys<{ foo?: string }>;
    expectTypeOf<TestPickRequiredKeys>().toEqualTypeOf<never>();
  });
});

describe('Prettify', () => {
  it('should return the identity type', () => {
    type TestPrettify = Prettify<{ foo: string }>;
    expectTypeOf<TestPrettify>().toEqualTypeOf<{ foo: string }>();
  });

  it('should not compile when the object has incorrect properties', () => {
    type TestPrettify = Prettify<{ foo: string }>;
    // @ts-expect-error - foo should be a string
    expectTypeOf<TestPrettify>().toEqualTypeOf<{ foo: 123 }>();
  });
});

describe('DeepPartial', () => {
  it('should make a top-level property optional', () => {
    type TestDeepPartial = DeepPartial<{ foo: string }>;
    expectTypeOf<TestDeepPartial>().toEqualTypeOf<{ foo?: string }>();
  });

  it('should make a nested property optional', () => {
    type TestDeepPartial = DeepPartial<{ foo: { bar: string } }>;
    expectTypeOf<TestDeepPartial>().toEqualTypeOf<{ foo?: { bar?: string } }>();
  });
});

describe('DeepRequired', () => {
  it('should make a top-level property required', () => {
    type TestDeepRequired = DeepRequired<{ foo?: string }>;
    expectTypeOf<TestDeepRequired>().toEqualTypeOf<{ foo: string }>();
  });

  it('should make a nested object property required', () => {
    type TestDeepRequired = DeepRequired<{ foo: { bar?: string } }>;
    expectTypeOf<TestDeepRequired>().toEqualTypeOf<{ foo: { bar: string } }>();
  });

  it('should make a nested array property required', () => {
    type TestDeepRequired = DeepRequired<{ foo: { bar: (string | undefined)[] } }>;
    expectTypeOf<TestDeepRequired>().toEqualTypeOf<{ foo: { bar: string[] } }>();
  });

  it('should not compile when the array has incorrect properties', () => {
    type TestDeepRequired = DeepRequired<{ foo: { bar: (string | undefined)[] } }>;
    // @ts-expect-error - bar should be an array of strings
    expectTypeOf<TestDeepRequired>().toEqualTypeOf<{ foo: { bar: undefined[] } }>();
  });

  it('should not compile when the object has incorrect properties', () => {
    type TestDeepRequired = DeepRequired<{ foo: string }>;
    // @ts-expect-error - foo should be a string
    expectTypeOf<TestDeepRequired>().toEqualTypeOf<{ foo: 123 }>();
  });
});

describe('UnionToTuple', () => {
  it('should return a tuple of the union types', () => {
    type TestUnionToTuple = UnionToTuple<1 | 2>;
    // UnionToTuple can return items in any order, so we need to check that the array contains the expected items
    type Parts = 1 | 2;
    expectTypeOf<TestUnionToTuple>().toMatchTypeOf<[Parts, Parts]>();
  });
});

describe('Stringify', () => {
  it('should stringify a string type', () => {
    type TestStringify = Stringify<string>;
    expectTypeOf<TestStringify>().toEqualTypeOf<'string'>();
  });

  it('should stringify a boolean type', () => {
    type TestStringify = Stringify<boolean>;
    expectTypeOf<TestStringify>().toEqualTypeOf<'boolean'>();
  });

  it('should stringify a number type', () => {
    type TestStringify = Stringify<number>;
    expectTypeOf<TestStringify>().toEqualTypeOf<'number'>();
  });

  it('should stringify a bigint type', () => {
    type TestStringify = Stringify<bigint>;
    expectTypeOf<TestStringify>().toEqualTypeOf<'bigint'>();
  });

  it('should stringify an unknown type', () => {
    type TestStringify = Stringify<unknown>;
    expectTypeOf<TestStringify>().toEqualTypeOf<'unknown'>();
  });

  it('should stringify an undefined type', () => {
    type TestStringify = Stringify<undefined>;
    expectTypeOf<TestStringify>().toEqualTypeOf<'undefined'>();
  });

  it('should stringify a null type', () => {
    type TestStringify = Stringify<null>;
    expectTypeOf<TestStringify>().toEqualTypeOf<'null'>();
  });

  it('should stringify a symbol type', () => {
    type TestStringify = Stringify<symbol>;
    expectTypeOf<TestStringify>().toEqualTypeOf<'symbol'>();
  });

  it('should stringify an array type', () => {
    type TestStringify = Stringify<Array<string>>;
    expectTypeOf<TestStringify>().toEqualTypeOf<'string[]'>();
  });

  it('should stringify an empty object type', () => {
    type TestStringify = Stringify<{}>;
    expectTypeOf<TestStringify>().toEqualTypeOf<'{}'>();
  });

  it('should stringify an `object` type', () => {
    type TestStringify = Stringify<object>;
    expectTypeOf<TestStringify>().toEqualTypeOf<'{}'>();
  });

  it('should stringify a `Record<string, never>` type', () => {
    type TestStringify = Stringify<Record<string, never>>;
    expectTypeOf<TestStringify>().toEqualTypeOf<'{ [x: string]: never; }'>();
  });

  it('should stringify a `Record<string, string>` type', () => {
    type TestStringify = Stringify<Record<string, string>>;
    expectTypeOf<TestStringify>().toEqualTypeOf<'{ [x: string]: string; }'>();
  });

  it('should stringify a `{ [x: string]: string }` type', () => {
    type TestStringify = Stringify<{ [x: string]: string }>;
    expectTypeOf<TestStringify>().toEqualTypeOf<'{ [x: string]: string; }'>();
  });

  it('should stringify a `{ [x: string]: unknown }` type', () => {
    type TestStringify = Stringify<{ [x: string]: unknown }>;
    expectTypeOf<TestStringify>().toEqualTypeOf<'{ [x: string]: unknown; }'>();
  });

  it('should stringify a `Record<string, unknown>` type', () => {
    type TestStringify = Stringify<Record<string, unknown>>;
    expectTypeOf<TestStringify>().toEqualTypeOf<'{ [x: string]: unknown; }'>();
  });

  it('should stringify an array of empty object types', () => {
    type TestStringify = Stringify<Array<{}>>;
    expectTypeOf<TestStringify>().toEqualTypeOf<'{}[]'>();
  });

  it('should stringify an object type with a single required property', () => {
    type TestStringify = Stringify<{ foo: string }>;
    expectTypeOf<TestStringify>().toEqualTypeOf<'{ foo: string; }'>();
  });

  it('should stringify an object type with a single optional property', () => {
    type TestStringify = Stringify<{ foo?: string }>;
    expectTypeOf<TestStringify>().toEqualTypeOf<'{ foo?: string; }'>();
  });

  it('should stringify an object type with multiple properties', () => {
    type TestStringify = Stringify<{ foo: string; bar?: number }>;
    // The order of the properties is not guaranteed, so we need to check that the string matches the expected pattern
    type Parts = `foo: string;` | `bar?: number;`;
    expectTypeOf<TestStringify>().toMatchTypeOf<`{ ${Parts} ${Parts} }`>();
  });

  it('should stringify an object type with a nested object property', () => {
    type TestStringify = Stringify<{ foo: { bar: string } }>;
    expectTypeOf<TestStringify>().toEqualTypeOf<'{ foo: { bar: string; }; }'>();
  });

  it('should stringify an object type with an array property', () => {
    type TestStringify = Stringify<{ foo: { bar: string }[] }>;
    expectTypeOf<TestStringify>().toEqualTypeOf<'{ foo: { bar: string; }[]; }'>();
  });

  it('should stringify an array of unknown record types', () => {
    type TestStringify = Stringify<{ [x: string]: unknown }[]>;
    expectTypeOf<TestStringify>().toEqualTypeOf<'{ [x: string]: unknown; }[]'>();
  });
});
