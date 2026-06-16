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
    expect(buildPoweredByWatermark('my-agent', AgentPlatformEnum.WHATSAPP)).to.equal(
      NOVU_AGENT_POWERED_WATERMARK_TEXT
    );
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
    const markdown = `Hello\n\n${NOVU_AGENT_POWERED_WATERMARK_TEXT}`;

    expect(contentHasPoweredByWatermark(markdown)).to.equal(true);
  });

  it('does not treat unrelated body text as watermarked', () => {
    expect(contentHasPoweredByWatermark('Hello there')).to.equal(false);
  });
});
