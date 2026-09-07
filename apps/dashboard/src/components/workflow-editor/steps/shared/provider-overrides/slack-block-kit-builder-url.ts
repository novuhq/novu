const SLACK_BLOCK_KIT_BUILDER_BASE_URL = 'https://app.slack.com/block-kit-builder';

/**
 * Slack's Block Kit Builder loads a message from the URL hash:
 * `https://app.slack.com/block-kit-builder/#{encodeURIComponent(JSON.stringify({ blocks }))}`
 */
export function buildSlackBlockKitBuilderUrl(override?: Record<string, unknown>): string {
  const blocks = override?.blocks;

  if (!Array.isArray(blocks) || blocks.length === 0) {
    return SLACK_BLOCK_KIT_BUILDER_BASE_URL;
  }

  return `${SLACK_BLOCK_KIT_BUILDER_BASE_URL}/#${encodeURIComponent(JSON.stringify({ blocks }))}`;
}
