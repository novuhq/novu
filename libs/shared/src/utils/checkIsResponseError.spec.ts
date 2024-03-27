import { checkIsResponseError } from './checkIsResponseError';
import { IResponseError } from '../types';

describe('checkIsResponseError', () => {
  it('should return true for a valid IResponseError object', () => {
    const error: IResponseError = {
      error: 'Something went wrong',
      message: 'An error occurred',
      statusCode: 500,
    };

    const result = checkIsResponseError(error);
    expect(result).toBe(true);
  });

  it('should return false for null', () => {
    const result = checkIsResponseError(null);
    expect(result).toBe(false);
  });

  it('should return false for undefined', () => {
    const result = checkIsResponseError(undefined);
    expect(result).toBe(false);
  });

  it('should return false for a non-object value', () => {
    const result = checkIsResponseError('This is a string');
    expect(result).toBe(false);
  });

  it('should return false if the object is missing the "error" property', () => {
    const error = {
      message: 'An error occurred',
      statusCode: 500,
    };

    const result = checkIsResponseError(error);
    expect(result).toBe(false);
  });

  it('should return false if the object is missing the "message" property', () => {
    const error = {
      error: 'Something went wrong',
      statusCode: 500,
    };

    const result = checkIsResponseError(error);
    expect(result).toBe(false);
  });

  it('should return false if the object is missing the "statusCode" property', () => {
    const error = {
      error: 'Something went wrong',
      message: 'An error occurred',
    };

    const result = checkIsResponseError(error);
    expect(result).toBe(false);
  });
});
