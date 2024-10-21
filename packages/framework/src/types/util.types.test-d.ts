import { describe, it } from 'vitest';
import {
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
  it('should compile when the type is an awaitable', () => {
    type TestAwaitable = Awaitable<Promise<string>>;
    const testAwaitableValid: TestAwaitable = Promise.resolve('bar');
  });

  it('should compile when the type is not an awaitable', () => {
    type TestAwaitable = Awaitable<string>;
    const testAwaitableValid: TestAwaitable = 'bar';
  });

  it('should not compile when a non-awaitable type has incorrect properties', () => {
    type TestAwaitable = Awaitable<{ foo: string }>;
    // @ts-expect-error - foo should be a string
    const testAwaitableInvalid: TestAwaitable = { foo: 123 };
  });

  it('should not compile when an awaitable type has incorrect properties', () => {
    type TestAwaitable = Awaitable<{ foo: string }>;
    // @ts-expect-error - foo should be a string
    const testAwaitableInvalid: TestAwaitable = Promise.resolve({ foo: 123 });
  });
});

describe('ConditionalPartial', () => {
  it('should compile an empty object when the condition is true', () => {
    type TestConditionalPartialTrue = ConditionalPartial<{ foo: string }, true>;
    const testConditionalPartialTrueValid: TestConditionalPartialTrue = {};
  });

  it('should compile an object with the correct type of properties when the condition is true', () => {
    type TestConditionalPartialTrue = ConditionalPartial<{ foo: string }, true>;
    const testConditionalPartialTrueValid: TestConditionalPartialTrue = { foo: 'bar' };
  });

  it('should not compile an object with the wrong type of properties when the condition is true', () => {
    type TestConditionalPartialTrue = ConditionalPartial<{ foo: string }, true>;
    // @ts-expect-error - foo should be a string
    const testConditionalPartialTrueInvalid: TestConditionalPartialTrue = { foo: 123 };
  });

  it('should compile an object with the required properties when the condition is false', () => {
    type TestConditionalPartialFalse = ConditionalPartial<{ foo: string }, false>;
    const testConditionalPartialFalseValid: TestConditionalPartialFalse = { foo: 'bar' };
  });

  it('should not compile an empty object when the condition is false', () => {
    type TestConditionalPartialFalse = ConditionalPartial<{ foo: string }, false>;
    // @ts-expect-error: 'foo' is required but missing
    const testConditionalPartialFalseInvalid: TestConditionalPartialFalse = {};
  });

  it('should not compile when the first argument is not an indexable type', () => {
    // @ts-expect-error - string is not an object
    type TestConditionalPartialFalse = ConditionalPartial<string, false>;
  });
});

describe('PickOptional', () => {
  it('should compile when the optional property is present', () => {
    type TestPickOptional = PickOptional<{ foo?: string }>;
    const testPickOptionalValid: TestPickOptional = { foo: 'bar' };
  });

  it('should not compile when the optional property is the wrong type', () => {
    type TestPickOptional = PickOptional<{ foo?: string }>;
    // @ts-expect-error - foo should be a string
    const testPickOptionalInvalid: TestPickOptional = { foo: 123 };
  });

  it('should compile when the optional property is not present', () => {
    type TestPickOptional = PickOptional<{ foo?: string }>;
    const testPickOptionalValid: TestPickOptional = {};
  });

  it('should not compile when specifying a required property', () => {
    type TestPickOptional = PickOptional<{ foo?: string; bar: string }>;
    // @ts-expect-error - bar should not be present
    const testPickOptionalInvalid: TestPickOptional = { bar: 'bar' };
  });
});

describe('PickOptionalKeys', () => {
  it('should compile when the optional property is present', () => {
    type TestPickOptionalKeys = PickOptionalKeys<{ foo?: string }>;
    const testPickOptionalKeysValid: TestPickOptionalKeys = 'foo';
  });

  it('should not compile when the object has no optional properties', () => {
    type TestPickOptionalKeys = PickOptionalKeys<{ foo: string }>;
    // @ts-expect-error - no optional property is present
    const testPickOptionalKeysInvalid: TestPickOptionalKeys = 'invalid';
  });
});

describe('PickRequired', () => {
  it('should compile when the required property is present', () => {
    type TestPickRequired = PickRequired<{ foo: string }>;
    const testPickRequiredValid: TestPickRequired = { foo: 'bar' };
  });

  it('should not compile when the required property is the wrong type', () => {
    type TestPickRequired = PickRequired<{ foo: string }>;
    // @ts-expect-error - foo should be a string
    const testPickRequiredInvalid: TestPickRequired = { foo: 123 };
  });

  it('should not compile when the required property is not present', () => {
    type TestPickRequired = PickRequired<{ foo: string }>;
    // @ts-expect-error - foo should be present
    const testPickRequiredInvalid: TestPickRequired = {};
  });

  it('should not compile when specifying an optional property', () => {
    type TestPickRequired = PickRequired<{ foo?: string; bar: string }>;
    // @ts-expect-error - foo should not be present
    const testPickRequiredInvalid: TestPickRequired = { foo: 'bar', bar: 'bar' };
  });
});

describe('PickRequiredKeys', () => {
  it('should compile when the object is empty', () => {
    type TestPickRequiredKeys = PickRequiredKeys<{ foo: string }>;
    const testPickRequiredKeysValid: TestPickRequiredKeys = 'foo';
  });

  it('should not compile when the object has no required properties', () => {
    type TestPickRequiredKeys = PickRequiredKeys<{ foo?: string }>;
    // @ts-expect-error - no required property is present
    const testPickRequiredKeysInvalid: TestPickRequiredKeys = 'invalid';
  });
});

describe('Prettify', () => {
  it('should compile the prettified type to the identity type', () => {
    type TestPrettify = Prettify<{ foo: string }>;
    const testPrettifyValid: TestPrettify = { foo: 'bar' };
  });

  it('should not compile when the object has incorrect properties', () => {
    type TestPrettify = Prettify<{ foo: string }>;
    // @ts-expect-error - foo should be a string
    const testPrettifyInvalid: TestPrettify = { foo: 123 };
  });
});

describe('DeepPartial', () => {
  it('should make a top-level property optional', () => {
    type TestDeepPartial = DeepPartial<{ foo: string }>;
    const testDeepPartialValid: TestDeepPartial = { foo: undefined };
  });

  it('should make a nested property optional', () => {
    type TestDeepPartial = DeepPartial<{ foo: { bar: string } }>;
    const testDeepPartialValid: TestDeepPartial = { foo: { bar: undefined } };
  });
});

describe('DeepRequired', () => {
  it('should make a top-level property required', () => {
    type TestDeepRequired = DeepRequired<{ foo?: string }>;
    const testDeepRequiredValid: TestDeepRequired = { foo: 'bar' };
  });

  it('should make a nested object property required', () => {
    type TestDeepRequired = DeepRequired<{ foo: { bar?: string } }>;
    const testDeepRequiredValid: TestDeepRequired = { foo: { bar: 'bar' } };
  });

  it('should make a nested array property required', () => {
    type TestDeepRequired = DeepRequired<{ foo: { bar: (string | undefined)[] } }>;
    const testDeepRequiredValid: TestDeepRequired = { foo: { bar: ['bar'] } };
  });

  it('should not compile when the array has incorrect properties', () => {
    type TestDeepRequired = DeepRequired<{ foo: { bar: (string | undefined)[] } }>;
    // @ts-expect-error - bar should be an array of strings
    const testDeepRequiredInvalid: TestDeepRequired = { foo: { bar: [undefined] } };
  });

  it('should not compile when the object has incorrect properties', () => {
    type TestDeepRequired = DeepRequired<{ foo: string }>;
    // @ts-expect-error - foo should be a string
    const testDeepRequiredInvalid: TestDeepRequired = { foo: 123 };
  });
});
