/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { createGoSnippet, createPhpSnippet, createPythonSnippet } from './code-snippets';

const identifier = 'welcome-workflow';

describe('createPhpSnippet', () => {
  it('does not throw when to is missing', () => {
    expect(() => createPhpSnippet({ identifier, to: undefined as never, payload: '{}' })).not.toThrow();
    expect(createPhpSnippet({ identifier, to: undefined as never, payload: '{}' })).toContain("to: 'subscriber-id'");
  });

  it('renders an empty PHP array when payload is null or an array', () => {
    expect(createPhpSnippet({ identifier, to: { subscriberId: 'abc' }, payload: 'null' })).toContain('payload: []');
    expect(createPhpSnippet({ identifier, to: { subscriberId: 'abc' }, payload: '[1,2]' })).toContain('payload: []');
  });
});

describe('createGoSnippet', () => {
  it('does not throw when to is missing', () => {
    expect(() => createGoSnippet({ identifier, to: undefined as never, payload: '{}' })).not.toThrow();
    expect(createGoSnippet({ identifier, to: undefined as never, payload: '{}' })).toContain('"subscriber-id"');
  });

  it('renders an empty Go map when payload is null or an array', () => {
    expect(createGoSnippet({ identifier, to: { subscriberId: 'abc' }, payload: 'null' })).toContain(
      'Payload: map[string]any{},'
    );
    expect(createGoSnippet({ identifier, to: { subscriberId: 'abc' }, payload: '[1,2]' })).toContain(
      'Payload: map[string]any{},'
    );
  });
});

describe('createPythonSnippet', () => {
  it('does not throw when to is missing', () => {
    expect(() => createPythonSnippet({ identifier, to: undefined as never, payload: 'null' })).not.toThrow();
  });
});
