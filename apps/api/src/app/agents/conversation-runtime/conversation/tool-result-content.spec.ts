import { expect } from 'chai';
import { capToolResultContent } from './tool-result-content';

describe('capToolResultContent', () => {
  it('keeps parts that fit unchanged', () => {
    const parts = [
      { type: 'text' as const, text: 'Found 2 rows' },
      { type: 'json' as const, value: { rows: [1, 2] } },
      { type: 'citation' as const, url: 'https://example.com', title: 'Example' },
    ];

    expect(capToolResultContent(parts, 1024)).to.deep.equal({ content: parts, truncated: false });
  });

  it('stores media without its data and marks the content truncated', () => {
    const result = capToolResultContent(
      [{ type: 'media', mediaType: 'image/png', data: 'aGVsbG8=', name: 'chart.png' }],
      1024
    );

    expect(result).to.deep.equal({
      content: [{ type: 'media', mediaType: 'image/png', name: 'chart.png' }],
      truncated: true,
    });
  });

  it('cuts the first text part that does not fit and drops the parts after it', () => {
    const result = capToolResultContent(
      [
        { type: 'text', text: 'abcd' },
        { type: 'text', text: 'efghij' },
        { type: 'json', value: { dropped: true } },
      ],
      7
    );

    expect(result).to.deep.equal({
      content: [
        { type: 'text', text: 'abcd' },
        { type: 'text', text: 'efg' },
      ],
      truncated: true,
    });
  });

  it('drops a non-text part that does not fit instead of cutting it', () => {
    const result = capToolResultContent(
      [
        { type: 'text', text: 'ok' },
        { type: 'json', value: { big: 'x'.repeat(100) } },
        { type: 'text', text: 'after' },
      ],
      50
    );

    expect(result).to.deep.equal({ content: [{ type: 'text', text: 'ok' }], truncated: true });
  });

  it('never splits a multi-byte character', () => {
    const result = capToolResultContent([{ type: 'text', text: 'aé€' }], 4);

    expect(result).to.deep.equal({ content: [{ type: 'text', text: 'aé' }], truncated: true });
  });
});
