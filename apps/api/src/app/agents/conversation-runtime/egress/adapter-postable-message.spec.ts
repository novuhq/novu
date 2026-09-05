import { expect } from 'chai';
import type { CardElement } from 'chat';

import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { SLACK_MARKDOWN_TEXT_LIMIT } from '../../shared/util/slack-section-limits';
import { buildAdapterPostableMessage, type OutboundBrandingContext } from './adapter-postable-message';
import type { ChatSdkReplyContent } from './file-materializer.service';

/**
 * `AdapterPostableMessage` is a wide chat-sdk union (string | markdown | card | ...).
 * The gateway only ever builds the object shapes, so narrow once for assertions.
 */
type PostablePayload = { markdown?: string; card?: CardElement; files?: unknown };

function build(content: ChatSdkReplyContent, branding: OutboundBrandingContext): PostablePayload {
  return buildAdapterPostableMessage(content, branding) as PostablePayload;
}

describe('buildAdapterPostableMessage', () => {
  const brandedSlack = {
    removeNovuBranding: false,
    agentIdentifier: 'my-agent',
    platform: AgentPlatformEnum.SLACK,
  };

  const unbrandedSlack = {
    removeNovuBranding: true,
    agentIdentifier: 'my-agent',
    platform: AgentPlatformEnum.SLACK,
  };

  it('keeps branded text replies on the markdown path instead of converting to a card', () => {
    const postable = build({ markdown: 'Hello **world**' }, brandedSlack);

    expect(postable.card).to.equal(undefined);
    expect(postable.markdown).to.be.a('string');
    expect(postable.markdown).to.include('Hello **world**');
    expect(postable.markdown).to.include('Powered by [Novu](');
    expect(postable.markdown).to.include('go.novu.co/agent-powered');
  });

  it('leaves cards untouched so approval and connect cards keep their structure', () => {
    const card: CardElement = {
      type: 'card',
      children: [
        { type: 'text', content: 'Approve tool?' },
        {
          type: 'actions',
          children: [{ type: 'button', id: 'approve', label: 'Approve' }],
        },
      ],
    };

    const postable = build({ card }, brandedSlack);

    expect(postable.card).to.deep.equal(card);
    expect(postable.markdown).to.equal(undefined);
  });

  it('skips the watermark when removeNovuBranding is enabled', () => {
    const postable = build({ markdown: 'Hello **world**' }, unbrandedSlack);

    expect(postable).to.deep.equal({ markdown: 'Hello **world**', files: undefined });
  });

  it('never appends the watermark on web chat, even for branded orgs', () => {
    const postable = build({ markdown: 'Hello **world**' }, { ...brandedSlack, platform: AgentPlatformEnum.WEB_CHAT });

    expect(postable).to.deep.equal({ markdown: 'Hello **world**', files: undefined });
  });

  it('still brands other platforms when the org has not removed branding', () => {
    for (const platform of [AgentPlatformEnum.TEAMS, AgentPlatformEnum.TELEGRAM, AgentPlatformEnum.WHATSAPP]) {
      const postable = build({ markdown: 'Hello **world**' }, { ...brandedSlack, platform });

      expect(postable.markdown, platform).to.include('Powered by');
    }
  });

  it('falls back to a split card when Slack markdown exceeds the markdown_text limit', () => {
    const oversized = `x`.repeat(SLACK_MARKDOWN_TEXT_LIMIT + 1);

    const postable = build({ markdown: oversized }, brandedSlack);

    expect(postable.markdown).to.equal(undefined);
    expect(postable.card?.type).to.equal('card');
    const children = postable.card?.children ?? [];
    expect(children.length).to.be.greaterThan(1);
    expect(children.every((child) => child.type === 'text' && child.content.length <= 3000)).to.equal(true);
  });
});
