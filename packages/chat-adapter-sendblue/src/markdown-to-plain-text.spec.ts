import { describe, expect, it } from 'vitest';
import { markdownToPlainText } from './markdown-to-plain-text.js';

describe('markdownToPlainText', () => {
  it('converts a GFM table to an ASCII table', () => {
    const plain = markdownToPlainText(
      ['| Provider | Count |', '| --- | --- |', '| Slack | 61 |', '| Email | 46 |'].join('\n')
    );

    expect(plain).toContain('Provider');
    expect(plain).toContain('Count');
    expect(plain).toContain('Slack');
    expect(plain).toContain('61');
    expect(plain).toContain('Email');
    expect(plain).toContain('46');
    expect(plain).not.toContain('| ---');
  });

  it('converts markdown links to label (url) form', () => {
    const plain = markdownToPlainText('See [the docs](https://example.com/path) for details.');

    expect(plain).toBe('See the docs (https://example.com/path) for details.');
  });

  it('strips common markdown decorations while preserving structure', () => {
    const plain = markdownToPlainText('## Report\n\nHello **world** and _team_.\n\nThanks!');

    expect(plain).toBe('Report\n\nHello world and team.\n\nThanks!');
  });

  it('returns an empty string for empty input', () => {
    expect(markdownToPlainText('')).toBe('');
  });
});
