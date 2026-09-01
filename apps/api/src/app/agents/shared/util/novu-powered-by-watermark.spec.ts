import { expect } from 'chai';
import type { CardElement } from 'chat';

import { AgentPlatformEnum } from '../enums/agent-platform.enum';
import {
  appendPoweredByWatermarkToMarkdown,
  brandOutboundMarkdownReply,
  buildBrandedMarkdownReply,
  buildPoweredByWatermark,
  contentHasPoweredByWatermark,
  NOVU_AGENT_POWERED_URL,
  NOVU_AGENT_POWERED_WATERMARK_TEXT,
} from './novu-powered-by-watermark';

type Reply = { markdown?: string; card?: CardElement };

describe('novu-powered-by-watermark', () => {
  it('returns link-less text on WhatsApp', () => {
    const watermark = buildPoweredByWatermark('my-agent', AgentPlatformEnum.WHATSAPP);

    expect(watermark.startsWith(NOVU_AGENT_POWERED_WATERMARK_TEXT)).to.equal(true);
    expect(watermark.length).to.be.greaterThan(NOVU_AGENT_POWERED_WATERMARK_TEXT.length);
  });

  it('returns attributed Slack mrkdwn link on Slack with only Novu linked', () => {
    const watermark = buildPoweredByWatermark('my-agent', AgentPlatformEnum.SLACK);

    expect(watermark.startsWith('Powered by <')).to.equal(true);
    expect(watermark).to.include('|Novu>');
    expect(watermark).to.not.include('[Novu](');
    expect(watermark).to.include(NOVU_AGENT_POWERED_URL);
    expect(watermark).to.include('utm_source=my-agent');
    expect(watermark).to.include('utm_channel=slack');
  });

  it('returns attributed markdown link on Teams with only Novu linked', () => {
    const watermark = buildPoweredByWatermark('my-agent', AgentPlatformEnum.TEAMS);

    expect(watermark.startsWith('Powered by [Novu](')).to.equal(true);
    expect(watermark).to.not.include('[Powered by Novu](');
    expect(watermark).to.include(NOVU_AGENT_POWERED_URL);
    expect(watermark).to.include('utm_source=my-agent');
    expect(watermark).to.include('utm_channel=teams');
  });

  it('wraps markdown in a card with a muted watermark footnote', () => {
    const card = buildBrandedMarkdownReply('Hello there', 'my-agent', AgentPlatformEnum.SLACK);

    expect(card.type).to.equal('card');
    expect(card.children).to.have.length(2);
    expect(card.children[0]).to.deep.equal({ type: 'text', content: 'Hello there' });
    expect(card.children[1]?.type).to.equal('text');
    expect((card.children[1] as { style?: string }).style).to.equal('muted');
    expect((card.children[1] as { content?: string }).content).to.include('Powered by <');
    expect((card.children[1] as { content?: string }).content).to.include('|Novu>');
  });

  it('detects Slack mrkdwn watermark in markdown', () => {
    const markdown = `Hello\n\nPowered by <${NOVU_AGENT_POWERED_URL}?utm_campaign=agent-powered|Novu>`;

    expect(contentHasPoweredByWatermark(markdown)).to.equal(true);
  });

  it('detects attributed watermark in markdown', () => {
    const markdown = `Hello\n\nPowered by [Novu](${NOVU_AGENT_POWERED_URL}?utm_campaign=agent-powered)`;

    expect(contentHasPoweredByWatermark(markdown)).to.equal(true);
  });

  it('detects legacy attributed watermark in markdown', () => {
    const markdown = `Hello\n\n[Powered by Novu](${NOVU_AGENT_POWERED_URL}?utm_campaign=agent-powered)`;

    expect(contentHasPoweredByWatermark(markdown)).to.equal(true);
  });

  it('detects link-less watermark in markdown', () => {
    const watermark = buildPoweredByWatermark('my-agent', AgentPlatformEnum.WHATSAPP);
    const markdown = `Hello\n\n${watermark}`;

    expect(contentHasPoweredByWatermark(markdown)).to.equal(true);
  });

  it('does not treat plain Powered by Novu text as watermarked', () => {
    expect(contentHasPoweredByWatermark(`Hello\n\n${NOVU_AGENT_POWERED_WATERMARK_TEXT}`)).to.equal(false);
  });

  it('does not treat unrelated body text as watermarked', () => {
    expect(contentHasPoweredByWatermark('Hello there')).to.equal(false);
    expect(contentHasPoweredByWatermark('Powered by Novu is a great product')).to.equal(false);
    expect(contentHasPoweredByWatermark('Hello\n\nPowered by Novu is great')).to.equal(false);
  });

  it('appends an attributed markdown footnote on EMAIL without wrapping in a card', () => {
    const content: Reply = { markdown: 'Hello there' };
    const branded = brandOutboundMarkdownReply(content, {
      removeNovuBranding: false,
      agentIdentifier: 'my-agent',
      platform: AgentPlatformEnum.EMAIL,
    });

    expect(branded.card).to.equal(undefined);
    expect(branded.markdown).to.include('Hello there');
    expect(branded.markdown).to.include('Powered by [Novu](');
    expect(branded.markdown).to.include(NOVU_AGENT_POWERED_URL);
    expect(branded.markdown).to.include('utm_channel=email');
    expect(contentHasPoweredByWatermark(branded.markdown as string)).to.equal(true);
  });

  it('does not append a second EMAIL footnote when the watermark is already present', () => {
    const once = appendPoweredByWatermarkToMarkdown('Hello there', 'my-agent', AgentPlatformEnum.EMAIL);
    const twice = appendPoweredByWatermarkToMarkdown(once, 'my-agent', AgentPlatformEnum.EMAIL);

    expect(twice).to.equal(once);
  });

  it('still wraps Slack markdown replies in a branding card', () => {
    const content: Reply = { markdown: 'Hello there' };
    const branded = brandOutboundMarkdownReply(content, {
      removeNovuBranding: false,
      agentIdentifier: 'my-agent',
      platform: AgentPlatformEnum.SLACK,
    });

    expect(branded.markdown).to.equal(undefined);
    expect(branded.card).to.deep.equal(buildBrandedMarkdownReply('Hello there', 'my-agent', AgentPlatformEnum.SLACK));
  });

  it('leaves markdown unchanged when Novu branding is removed', () => {
    const content: Reply = { markdown: 'Hello there' };
    const branded = brandOutboundMarkdownReply(content, {
      removeNovuBranding: true,
      agentIdentifier: 'my-agent',
      platform: AgentPlatformEnum.EMAIL,
    });

    expect(branded).to.equal(content);
  });

  it('leaves explicit cards unchanged', () => {
    const content: Reply = { card: { type: 'card', children: [{ type: 'text', content: 'Approve?' }] } };
    const branded = brandOutboundMarkdownReply(content, {
      removeNovuBranding: false,
      agentIdentifier: 'my-agent',
      platform: AgentPlatformEnum.EMAIL,
    });

    expect(branded).to.equal(content);
  });

  it('leaves already-watermarked markdown unchanged', () => {
    const markdown = appendPoweredByWatermarkToMarkdown('Hello there', 'my-agent', AgentPlatformEnum.EMAIL);
    const content: Reply = { markdown };
    const branded = brandOutboundMarkdownReply(content, {
      removeNovuBranding: false,
      agentIdentifier: 'my-agent',
      platform: AgentPlatformEnum.EMAIL,
    });

    expect(branded).to.equal(content);
  });
});
