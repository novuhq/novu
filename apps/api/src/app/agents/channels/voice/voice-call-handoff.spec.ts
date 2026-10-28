import { expect } from 'chai';
import { createDialingHandoff, parseVoiceCallHandoff, serializeVoiceCallHandoff } from './voice-call-handoff';

describe('voice call handoff', () => {
  it('round-trips a dialing record and still reads a lookup written before the handoff fields existed', () => {
    const stored = serializeVoiceCallHandoff(
      createDialingHandoff({
        environmentId: 'env1',
        organizationId: 'org1',
        interactionId: 'hi_1',
        subscriberId: 'sub-1',
      })
    );
    const parsed = parseVoiceCallHandoff(stored);

    expect(parsed).to.deep.equal({
      environmentId: 'env1',
      organizationId: 'org1',
      interactionId: 'hi_1',
      subscriberId: 'sub-1',
      status: 'dialing',
      inboundSeq: 0,
      utterances: [],
    });

    expect(parseVoiceCallHandoff(JSON.stringify({ environmentId: 'env1', organizationId: 'org1' }))).to.deep.equal({
      environmentId: 'env1',
      organizationId: 'org1',
      interactionId: '',
      subscriberId: '',
      status: 'dialing',
      inboundSeq: 0,
      utterances: [],
    });
  });

  it('rejects a lookup that cannot name an environment', () => {
    expect(parseVoiceCallHandoff('not-json')).to.equal(null);
    expect(parseVoiceCallHandoff(JSON.stringify({ organizationId: 'org1' }))).to.equal(null);
  });
});
