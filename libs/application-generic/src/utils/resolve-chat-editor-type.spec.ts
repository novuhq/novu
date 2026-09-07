import { describe, expect, it } from 'vitest';
import { resolveChatEditorType } from './resolve-chat-editor-type';

const mailyBody = JSON.stringify({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }],
});

describe('resolveChatEditorType', () => {
  it('prefers an explicit editorType', () => {
    expect(resolveChatEditorType('{% if true %}x{% endif %}', 'block')).toBe('block');
    expect(resolveChatEditorType(mailyBody, 'text')).toBe('text');
  });

  it('maps Maily JSON to block when editorType is unset or invalid', () => {
    expect(resolveChatEditorType(mailyBody, undefined)).toBe('block');
    expect(resolveChatEditorType(mailyBody, '')).toBe('block');
    expect(resolveChatEditorType(mailyBody, 'html')).toBe('block');
  });

  it('maps non-empty plain/Liquid bodies to text when editorType is unset', () => {
    expect(resolveChatEditorType('{% if true %}x{% endif %}', undefined)).toBe('text');
    expect(resolveChatEditorType('hello {{payload.foo}}', '')).toBe('text');
  });

  it('returns undefined for empty bodies when editorType is unset', () => {
    expect(resolveChatEditorType('', undefined)).toBeUndefined();
    expect(resolveChatEditorType(undefined, '')).toBeUndefined();
  });
});
