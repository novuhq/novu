import { expect } from 'chai';
import { CUSTOM_AGENT_EVENT_DATA_MAX_BYTES, isPersistableCustomEvent } from './custom-agent-event';

describe('isPersistableCustomEvent', () => {
  it('accepts a non-empty name and a payload at the 64KiB cap', () => {
    const data = 'x'.repeat(CUSTOM_AGENT_EVENT_DATA_MAX_BYTES - 2);

    expect(isPersistableCustomEvent({ name: 'order-progress', data })).to.equal(true);
  });

  it('skips a missing or empty name without minting a sequence', () => {
    expect(isPersistableCustomEvent({ name: '', data: { pct: 70 } })).to.equal(false);
    expect(isPersistableCustomEvent({ name: undefined, data: { pct: 70 } })).to.equal(false);
  });

  it('skips data whose JSON is over 64KiB UTF-8', () => {
    const data = 'x'.repeat(CUSTOM_AGENT_EVENT_DATA_MAX_BYTES - 1);

    expect(isPersistableCustomEvent({ name: 'order-progress', data })).to.equal(false);
  });
});
