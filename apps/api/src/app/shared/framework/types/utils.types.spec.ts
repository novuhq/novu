import { WithRequired, ConvertToConstantCase, testHeaderEnumValidity } from './utils.types';

/**
 * WithRequired tests
 */
type TestType = {
  optional?: string;
  required: number;
};

// Valid
export const validTestType: WithRequired<TestType, 'optional'> = {
  optional: 'test',
  required: 1,
};

// @ts-expect-error - Missing 'optional' property
export const invalidTestType: WithRequired<TestType, 'optional'> = {
  required: 1,
};

/**
 * ConvertToConstantCase tests
 */
type ValidString = ConvertToConstantCase<'test-string'>;
// Valid
export const validString: ValidString = 'TEST_STRING';

// @ts-expect-error - Incorrect case
export const invalidString: ValidString = 'test_string';

/**
 * testHeaderEnumValidity Tests
 */
enum ValidHeaderEnum {
  TEST_HEADER = 'Test-Header',
  ANOTHER_TEST_HEADER = 'Another-Test-Header',
}
testHeaderEnumValidity(ValidHeaderEnum);

enum InvalidKeyHeaderEnum {
  TEST_HEADER = 'Test-Header',
  Invalid_Header = 'Invalid-Header',
}
// @ts-expect-error - Invalid key - Invalid_Header
testHeaderEnumValidity(InvalidKeyHeaderEnum);

enum InvalidValueHeaderEnum {
  TEST_HEADER = 'Test-Header',
  ANOTHER_TEST_HEADER = 'another-test-header',
}
// @ts-expect-error - Invalid value on ANOTHER_TEST_HEADER: 'another-test-header'
testHeaderEnumValidity(InvalidValueHeaderEnum);
