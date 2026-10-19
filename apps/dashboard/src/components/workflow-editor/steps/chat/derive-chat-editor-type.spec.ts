import { describe, expect, it } from 'vitest';
import { deriveChatEditorType } from './derive-chat-editor-type';

const mailyBody = JSON.stringify({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }],
});

describe('deriveChatEditorType', () => {
  it('prefers an explicit editorType', () => {
    expect(deriveChatEditorType('{% if true %}x{% endif %}', 'block', true)).toBe('block');
    expect(deriveChatEditorType(mailyBody, 'text', true)).toBe('text');
  });

  it('routes Maily JSON to block when editorType is unset or invalid', () => {
    expect(deriveChatEditorType(mailyBody, undefined, true)).toBe('block');
    expect(deriveChatEditorType(mailyBody, '', true)).toBe('block');
  });

  it('routes non-empty plain/Liquid bodies to text when editorType is unset', () => {
    expect(deriveChatEditorType('{% if true %}x{% endif %}', undefined, true)).toBe('text');
    expect(deriveChatEditorType('hello {{payload.foo}}', undefined, true)).toBe('text');
  });

  it('defaults empty bodies to block when the flag is on', () => {
    expect(deriveChatEditorType('', undefined, true)).toBe('block');
    expect(deriveChatEditorType(undefined, undefined, true)).toBe('block');
  });

  it('defaults empty bodies to text when the flag is off', () => {
    expect(deriveChatEditorType('', undefined, false)).toBe('text');
  });
});
