/* cSpell:enableCompoundWords */
import { expect, describe, it } from 'vitest';
import { WithRequired, ConvertToConstantCase, testHttpHeaderEnumValidity, ValidateHttpHeaderCase } from './http';

describe('HTTP headers', () => {
  /**
   * This describe block resolves the Jest error of a test suite not having any tests.
   * It has no other purpose.
   */
  it('tests the Typescript compiler errors below', () => {
    expect(true).toEqual(true);
  });
});

/**
 * WithRequired tests
 */
type TestWithRequired = {
  optional?: string;
  required: number;
};
// Valid
export const validTestType: WithRequired<TestWithRequired, 'optional'> = {
  optional: 'test',
  required: 1,
};

// @ts-expect-error - Missing 'optional' property
export const invalidTestType: WithRequired<TestWithRequired, 'optional'> = {
  required: 1,
};

/**
 * ConvertToConstantCase tests
 */
// Valid
export const validConstantSingleString: ConvertToConstantCase<'Single'> = 'SINGLE';
export const validConstantSingleSingleString: ConvertToConstantCase<'Double-String'> = 'DOUBLE_STRING';
export const validConstantDoubleSingleString: ConvertToConstantCase<'DoubleWord-String'> = 'DOUBLEWORD_STRING';

// @ts-expect-error - Incorrect case - should be 'SINGLE'
export const invalidConstantSingleString: ConvertToConstantCase<'Single'> = 'single';

/**
 * ValidateHttpHeaderCase tests
 */
// Valid
export const validHttpHeaderSingleString: ValidateHttpHeaderCase<'Single'> = 'Single';
export const validHttpHeaderSingleSingleString: ValidateHttpHeaderCase<'Double-String'> = 'Double-String';
export const validHttpHeaderDoubleSingleString: ValidateHttpHeaderCase<'DoubleWord-String'> = 'DoubleWord-String';
export const validHttpHeaderUnion1String: ValidateHttpHeaderCase<'First-String' | 'Second-String'> = 'First-String';
export const validHttpHeaderUnion2String: ValidateHttpHeaderCase<'First-String' | 'Second-String'> = 'Second-String';
enum TestCapitalHeaderEnum {
  SINGLE = 'Single',
  INVALID = 'invalid-string',
  DOUBLE_STRING = 'Double-String',
  DOUBLEWORD_STRING = 'DoubleWord-String',
}
export const validHttpHeaderSingleEnum: ValidateHttpHeaderCase<TestCapitalHeaderEnum.SINGLE> = 'Single';
export const validHttpHeaderSingleSingleEnum: ValidateHttpHeaderCase<TestCapitalHeaderEnum.DOUBLE_STRING> =
  'Double-String';
export const validHttpHeaderDoubleSingleEnum: ValidateHttpHeaderCase<TestCapitalHeaderEnum.DOUBLEWORD_STRING> =
  'DoubleWord-String';

// @ts-expect-error - Incorrect case - 'invalid-string' literal type is not Capital-Case
export const invalidHttpHeaderSingleString: ValidateHttpHeaderCase<'invalid-string'> = 'Invalid';
// @ts-expect-error - Incorrect case - 'invalid-string' union type is not Capital-Case
export const invalidHttpHeaderUnionString: ValidateHttpHeaderCase<'First-String' | 'invalid-string'> = 'invalid-string';
// @ts-expect-error - Incorrect case - 'invalid-string' enum is not Capital-Case
export const invalidHttpHeaderEnumString: ValidateHttpHeaderCase<TestCapitalHeaderEnum.INVALID> = 'invalid';

/**
 * testHeaderEnumValidity Tests
 */
// Valid
enum ValidHeaderEnum {
  SINGLE = 'Single',
  DOUBLE_STRING = 'Double-String',
  DOUBLEWORD_STRING = 'DoubleWord-String',
}
testHttpHeaderEnumValidity(ValidHeaderEnum);

// Invalid
enum InvalidKeyHeaderEnum {
  SINGLE = 'Single',
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Invalid_Key = 'Invalid-Key',
}
// @ts-expect-error - Invalid key - Invalid_Key should be 'INVALID_KEY'
testHttpHeaderEnumValidity(InvalidKeyHeaderEnum);

enum InvalidValueHeaderEnum {
  SINGLE = 'Single',
  INVALID_VALUE = 'invalid-key',
}
// @ts-expect-error - Invalid value - 'another-test-header' should be 'Another-Test-Header'
testHttpHeaderEnumValidity(InvalidValueHeaderEnum);
