import { expect } from 'chai';

import { AgentPlatformEnum } from '../enums/agent-platform.enum';
import {
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

  it('returns attributed markdown link on Slack', () => {
    const watermark = buildPoweredByWatermark('my-agent', AgentPlatformEnum.SLACK);

    expect(watermark).to.include('[Powered by Novu](');
    expect(watermark).to.include(NOVU_AGENT_POWERED_URL);
    expect(watermark).to.include('utm_source=my-agent');
    expect(watermark).to.include('utm_channel=slack');
  });

  it('detects attributed watermark in markdown', () => {
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
