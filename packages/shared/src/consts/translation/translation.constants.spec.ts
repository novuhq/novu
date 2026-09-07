import { describe, expect, it } from 'vitest';

import { TRANSLATION_KEY_SINGLE_REGEX } from './translation.constants';

describe('TRANSLATION_KEY_SINGLE_REGEX', () => {
  describe('case-insensitive matching', () => {
    it('should match lowercase translation keys', () => {
      expect(TRANSLATION_KEY_SINGLE_REGEX.test('{{t.hello}}')).toBe(true);
      expect(TRANSLATION_KEY_SINGLE_REGEX.test('{{t.greeting}}')).toBe(true);
    });

    it('should match uppercase translation keys (case-insensitive)', () => {
      expect(TRANSLATION_KEY_SINGLE_REGEX.test('{{T.HELLO}}')).toBe(true);
      expect(TRANSLATION_KEY_SINGLE_REGEX.test('{{T.GREETING}}')).toBe(true);
    });

    it('should match mixed case translation keys', () => {
      expect(TRANSLATION_KEY_SINGLE_REGEX.test('{{T.helloWorld}}')).toBe(true);
      expect(TRANSLATION_KEY_SINGLE_REGEX.test('{{t.HelloWorld}}')).toBe(true);
      expect(TRANSLATION_KEY_SINGLE_REGEX.test('{{T.hello}}')).toBe(true);
    });
  });

  describe('key extraction', () => {
    it('should extract key from lowercase translation marker', () => {
      const match = '{{t.greeting}}'.match(TRANSLATION_KEY_SINGLE_REGEX);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe('greeting');
    });

    it('should extract key from uppercase translation marker', () => {
      const match = '{{T.GREETING}}'.match(TRANSLATION_KEY_SINGLE_REGEX);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe('GREETING');
    });

    it('should extract nested keys', () => {
      const match = '{{t.nested.key.value}}'.match(TRANSLATION_KEY_SINGLE_REGEX);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe('nested.key.value');
    });
  });

  describe('whitespace handling', () => {
    it('should match with spaces around the key', () => {
      expect(TRANSLATION_KEY_SINGLE_REGEX.test('{{ t.hello }}')).toBe(true);
      expect(TRANSLATION_KEY_SINGLE_REGEX.test('{{  t.hello  }}')).toBe(true);
    });

    it('should match with spaces around uppercase key', () => {
      expect(TRANSLATION_KEY_SINGLE_REGEX.test('{{ T.HELLO }}')).toBe(true);
    });
  });

  describe('special characters in keys', () => {
    it('should match keys with dashes', () => {
      expect(TRANSLATION_KEY_SINGLE_REGEX.test('{{t.hello-world}}')).toBe(true);
    });

    it('should match keys with underscores', () => {
      expect(TRANSLATION_KEY_SINGLE_REGEX.test('{{t.hello_world}}')).toBe(true);
    });

    it('should match keys with numbers', () => {
      expect(TRANSLATION_KEY_SINGLE_REGEX.test('{{t.item123}}')).toBe(true);
      expect(TRANSLATION_KEY_SINGLE_REGEX.test('{{t.123}}')).toBe(true);
    });
  });

  describe('non-matching cases', () => {
    it('should not match regular liquid variables', () => {
      expect(TRANSLATION_KEY_SINGLE_REGEX.test('{{payload.name}}')).toBe(false);
      expect(TRANSLATION_KEY_SINGLE_REGEX.test('{{subscriber.email}}')).toBe(false);
    });

    it('should not match incomplete translation markers', () => {
      expect(TRANSLATION_KEY_SINGLE_REGEX.test('{{t.}}')).toBe(false);
      expect(TRANSLATION_KEY_SINGLE_REGEX.test('{{t}}')).toBe(false);
    });

    it('should not match translation markers without braces', () => {
      expect(TRANSLATION_KEY_SINGLE_REGEX.test('t.hello')).toBe(false);
    });
  });

  describe('global regex usage warning', () => {
    it('should not have global flag to avoid state issues', () => {
      expect(TRANSLATION_KEY_SINGLE_REGEX.global).toBe(false);
    });

    it('should be safe to use .test() multiple times', () => {
      // Global regexes maintain state and cause inconsistent results
      // This test verifies the regex works correctly for multiple consecutive calls
      expect(TRANSLATION_KEY_SINGLE_REGEX.test('{{t.hello}}')).toBe(true);
      expect(TRANSLATION_KEY_SINGLE_REGEX.test('{{t.hello}}')).toBe(true);
      expect(TRANSLATION_KEY_SINGLE_REGEX.test('{{t.world}}')).toBe(true);
      expect(TRANSLATION_KEY_SINGLE_REGEX.test('{{T.HELLO}}')).toBe(true);
    });
  });
});
