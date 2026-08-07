import { describe, expect, it } from 'vitest';
import {
  ChatCardButtonIssueCodeEnum,
  getChatCardButtonFieldError,
  getChatCardButtonLabelError,
  getChatCardButtonUrlError,
  isChatCardButtonVariableValue,
  validateChatCardButtonField,
} from './chat-card-button';

describe('chat-card-button validation', () => {
  describe('getChatCardButtonLabelError', () => {
    it('requires a non-empty label', () => {
      expect(getChatCardButtonLabelError('')?.code).toBe(ChatCardButtonIssueCodeEnum.REQUIRED);
      expect(getChatCardButtonLabelError('   ')?.code).toBe(ChatCardButtonIssueCodeEnum.REQUIRED);
    });

    it('accepts any non-empty label: plain text, a {{ }} variable, or a combination', () => {
      expect(getChatCardButtonLabelError('View order')).toBeNull();
      // A bare path is just text — still a valid (non-empty) label.
      expect(getChatCardButtonLabelError('payload.label')).toBeNull();
      expect(getChatCardButtonLabelError('{{ payload.label }}')).toBeNull();
      expect(getChatCardButtonLabelError('Hi {{ subscriber.firstName }}')).toBeNull();
    });
  });

  describe('getChatCardButtonUrlError', () => {
    it('requires a non-empty url', () => {
      expect(getChatCardButtonUrlError('')?.code).toBe(ChatCardButtonIssueCodeEnum.REQUIRED);
      expect(getChatCardButtonUrlError('   ')?.code).toBe(ChatCardButtonIssueCodeEnum.REQUIRED);
    });

    it('accepts absolute http(s) URLs', () => {
      expect(getChatCardButtonUrlError('https://example.com')).toBeNull();
      expect(getChatCardButtonUrlError('http://example.com/path?a=b#c')).toBeNull();
    });

    it('accepts URLs that embed variables (text + variable)', () => {
      expect(getChatCardButtonUrlError('https://example.com/{{ payload.id }}')).toBeNull();
      expect(getChatCardButtonUrlError('https://{{ payload.host }}/path')).toBeNull();
    });

    it('accepts a whole/leading {{ }} variable value without checking url format', () => {
      expect(getChatCardButtonUrlError('{{ payload.url }}')).toBeNull();
      expect(getChatCardButtonUrlError('{{ payload.base }}/webhook')).toBeNull();
    });

    it('rejects a bare variable path (only {{ payload.url }} is a variable, a bare path is text)', () => {
      expect(getChatCardButtonUrlError('payload.url')?.code).toBe(ChatCardButtonIssueCodeEnum.INVALID_URL);
      expect(getChatCardButtonUrlError('subscriber.data.link')?.code).toBe(ChatCardButtonIssueCodeEnum.INVALID_URL);
    });

    it('rejects malformed URLs that are not variables', () => {
      expect(getChatCardButtonUrlError('example.com')?.code).toBe(ChatCardButtonIssueCodeEnum.INVALID_URL);
      expect(getChatCardButtonUrlError('not a url')?.code).toBe(ChatCardButtonIssueCodeEnum.INVALID_URL);
      expect(getChatCardButtonUrlError('foo{{ payload.id }}')?.code).toBe(ChatCardButtonIssueCodeEnum.INVALID_URL);
    });

    it('rejects non-http(s) schemes', () => {
      expect(getChatCardButtonUrlError('ftp://example.com')?.code).toBe(ChatCardButtonIssueCodeEnum.INVALID_URL);
      expect(getChatCardButtonUrlError('mailto:test@example.com')?.code).toBe(ChatCardButtonIssueCodeEnum.INVALID_URL);
      expect(getChatCardButtonUrlError('javascript:alert(1)')?.code).toBe(ChatCardButtonIssueCodeEnum.INVALID_URL);
    });
  });

  describe('isChatCardButtonVariableValue', () => {
    it('treats only a leading {{ }} expression as a variable; a bare path is text', () => {
      expect(isChatCardButtonVariableValue('{{ payload.url }}')).toBe(true);
      expect(isChatCardButtonVariableValue('{{ payload.base }}/webhook')).toBe(true);
      expect(isChatCardButtonVariableValue('payload.url')).toBe(false);
      expect(isChatCardButtonVariableValue('https://example.com')).toBe(false);
      expect(isChatCardButtonVariableValue('')).toBe(false);
    });
  });

  describe('getChatCardButtonFieldError / validateChatCardButtonField', () => {
    it('routes to the right validator per field', () => {
      expect(getChatCardButtonFieldError('label', '')?.code).toBe(ChatCardButtonIssueCodeEnum.REQUIRED);
      expect(getChatCardButtonFieldError('url', 'bad')?.code).toBe(ChatCardButtonIssueCodeEnum.INVALID_URL);
    });

    it('returns a message-only result for the injected UI validator', () => {
      expect(validateChatCardButtonField('url', 'https://example.com')).toBeNull();
      expect(typeof validateChatCardButtonField('url', '')).toBe('string');
      expect(typeof validateChatCardButtonField('label', '')).toBe('string');
    });
  });
});
