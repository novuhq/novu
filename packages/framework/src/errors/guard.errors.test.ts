import { describe, expect, it } from 'vitest';
import { ErrorCodeEnum, HttpStatusEnum } from '../constants';
import { FrameworkError, isNativeError } from './base.errors';
import { BridgeError } from './bridge.errors';
import { isFrameworkError, isPlatformError } from './guard.errors';
import { PlatformError } from './platform.errors';

class TestFrameworkError extends FrameworkError {
  statusCode = HttpStatusEnum.BAD_REQUEST;
  code = ErrorCodeEnum.WORKFLOW_NOT_FOUND_ERROR;
}

describe('error utils', () => {
  describe('isNativeError', () => {
    it('should return true for native errors', () => {
      expect(isNativeError(new Error('Test error'))).toBe(true);
    });

    it('should return true for framework errors', () => {
      expect(isNativeError(new TestFrameworkError('Unable to find the workflow'))).toBe(true);
    });

    const falseCases = [{}, null, undefined, 'Test error', 123, true, [], () => {}, Symbol('test')];

    falseCases.forEach((value) => {
      it(`should return false for ${typeof value}`, () => {
        expect(isNativeError(value)).toBe(false);
      });
    });
  });

  describe('isFrameworkError', () => {
    it('should return true for framework errors', () => {
      expect(isFrameworkError(new TestFrameworkError('Unable to find the workflow'))).toBe(true);
    });

    it('should return false for platform errors', () => {
      expect(isFrameworkError(new PlatformError(HttpStatusEnum.BAD_REQUEST, 'BAD_REQUEST', 'Workflow not found'))).toBe(
        false
      );
    });

    it('should return true for bridge errors', () => {
      expect(isFrameworkError(new BridgeError('Unable to find the runtime environment'))).toBe(true);
    });
  });

  describe('isPlatformError', () => {
    it('should return true for platform errors', () => {
      expect(isPlatformError(new PlatformError(HttpStatusEnum.BAD_REQUEST, 'BAD_REQUEST', 'Workflow not found'))).toBe(
        true
      );
    });

    it('should return false for framework errors', () => {
      expect(isPlatformError(new TestFrameworkError('Unable to find the workflow'))).toBe(false);
    });

    it('should return false for bridge errors', () => {
      expect(isPlatformError(new BridgeError('Unable to find the runtime environment'))).toBe(false);
    });
  });
});
