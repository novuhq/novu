import { expect } from 'chai';

import { AgentPlatformEnum } from '../enums/agent-platform.enum';
import {
  buildBrandedMarkdownReply,
  buildPoweredByWatermark,
  contentHasPoweredByWatermark,
  NOVU_AGENT_POWERED_URL,
  NOVU_AGENT_POWERED_WATERMARK_TEXT,
} from './novu-powered-by-watermark';

describe('novu-powered-by-watermark', () => {
  it('returns link-less text on WhatsApp', () => {
    const watermark = buildPoweredByWatermark('my-agent', AgentPlatformEnum.WHATSAPP);

    expect(watermark.startsWith(NOVU_AGENT_POWERED_WATERMARK_TEXT)).to.equal(true);
    expect(watermark.length).to.be.greaterThan(NOVU_AGENT_POWERED_WATERMARK_TEXT.length);
  });

  it('returns attributed markdown link on Slack with only Novu linked', () => {
    const watermark = buildPoweredByWatermark('my-agent', AgentPlatformEnum.SLACK);

    expect(watermark.startsWith('Powered by [Novu](')).to.equal(true);
    expect(watermark).to.not.include('[Powered by Novu](');
    expect(watermark).to.include(NOVU_AGENT_POWERED_URL);
    expect(watermark).to.include('utm_source=my-agent');
    expect(watermark).to.include('utm_channel=slack');
  });

  it('wraps markdown in a card with a muted watermark footnote', () => {
    const card = buildBrandedMarkdownReply('Hello there', 'my-agent', AgentPlatformEnum.SLACK);

    expect(card.type).to.equal('card');
    expect(card.children).to.have.length(2);
    expect(card.children[0]).to.deep.equal({ type: 'text', content: 'Hello there' });
    expect(card.children[1]?.type).to.equal('text');
    expect((card.children[1] as { style?: string }).style).to.equal('muted');
    expect((card.children[1] as { content?: string }).content).to.include('Powered by [Novu](');
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
});
