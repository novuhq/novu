import { describe, expect, it } from 'vitest';
import { buildSlackBlockKitBuilderUrl } from './slack-block-kit-builder-url';

describe('buildSlackBlockKitBuilderUrl', () => {
  it('returns the bare builder when there are no blocks', () => {
    expect(buildSlackBlockKitBuilderUrl()).toBe('https://app.slack.com/block-kit-builder');
    expect(buildSlackBlockKitBuilderUrl({})).toBe('https://app.slack.com/block-kit-builder');
    expect(buildSlackBlockKitBuilderUrl({ blocks: [] })).toBe('https://app.slack.com/block-kit-builder');
    expect(buildSlackBlockKitBuilderUrl({ text: 'hi' })).toBe('https://app.slack.com/block-kit-builder');
  });

  it('encodes blocks into the builder hash so Slack opens with that payload', () => {
    const blocks = [{ type: 'section', text: { type: 'mrkdwn', text: 'Hello' } }];
    const href = buildSlackBlockKitBuilderUrl({ text: 'fallback', blocks });

    expect(href).toBe(`https://app.slack.com/block-kit-builder/#${encodeURIComponent(JSON.stringify({ blocks }))}`);
  });
});
