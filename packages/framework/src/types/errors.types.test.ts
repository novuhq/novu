import { expect, it, describe } from 'vitest';
import { IErrorCodeKey, IErrorCodeVal, testErrorCodeEnumValidity } from './error.types';

describe('Error Codes', () => {
  /**
   * This describe block resolves the Jest error of a test suite not having any tests.
   * It has no other purpose.
   */
  it('tests the Typescript compiler errors below', () => {
    expect(true).toBe(true);
  });
});

/**
 * IErrorCodeKey tests
 */
// Valid
const validErrorCodeKey: IErrorCodeKey = 'SOMETHING_ERROR';

// @ts-expect-error - Not ending with `_ERROR`
const invalidErrorCodeKeySuffix: IErrorCodeKey = 'SOMETHING_WRONG';

// @ts-expect-error - Not uppercase
const invalidErrorCodeKeyCase: IErrorCodeKey = 'Something_ERROR';

/**
 * IErrorCodeVal tests
 */
// Valid
const validErrorCodeVal: IErrorCodeVal = 'SomethingError';

// @ts-expect-error - Not ending with `Error`
const invalidErrorCodeValSuffix: IErrorCodeVal = 'SomethingIssue';

// @ts-expect-error - Not PascalCase
const invalidErrorCodeValCase: IErrorCodeVal = 'somethingError';

/**
 * testErrorCodeEnumValidity Tests
 */
enum ValidErrorCodeEnum {
  SOMETHING_ERROR = 'SomethingError',
  ANOTHER_THING_ERROR = 'AnotherThingError',
}
testErrorCodeEnumValidity(ValidErrorCodeEnum);

enum InvalidKeyErrorCodeEnum {
  SOMETHING_ERROR = 'SomethingError',
  WRONG_FORMAT = 'WrongFormatError',
}
// @ts-expect-error - Invalid key - WRONG_FORMAT
testErrorCodeEnumValidity(InvalidKeyErrorCodeEnum);

enum InvalidValueErrorCodeEnum {
  SOMETHING_ERROR = 'SomethingError',
  ANOTHER_THING_ERROR = 'AnotherThingIssue',
}
// @ts-expect-error - Invalid value on ANOTHER_THING_ERROR: 'AnotherThingIssue'
testErrorCodeEnumValidity(InvalidValueErrorCodeEnum);

enum NonMatchingConstantCaseValueEnum {
  SOMETHING_ELSE_ERROR = 'SomethingError', // The CONSTANT_CASE key does not match the PascalCase value
}
// @ts-expect-error - Key must be CONSTANT_CASED version of the PascalCased value
testErrorCodeEnumValidity(NonMatchingConstantCaseValueEnum);
