import { VoiceCallEndReasonEnum } from '@novu/shared';
import { expect } from 'chai';
import { endReasonFromTermination } from './voice-call-end-reason';

describe('endReasonFromTermination', () => {
  it('maps the termination strings the shell actually produces', () => {
    expect(endReasonFromTermination('Max call duration exceeded')).to.equal(VoiceCallEndReasonEnum.MAX_DURATION);
    expect(endReasonFromTermination('end_call tool was called.')).to.equal(VoiceCallEndReasonEnum.AGENT_HANGUP);
    expect(endReasonFromTermination('user hung up')).to.equal(VoiceCallEndReasonEnum.PERSON_HANGUP);
    expect(endReasonFromTermination('Call ended by remote party')).to.equal(VoiceCallEndReasonEnum.PERSON_HANGUP);
    expect(endReasonFromTermination('something new')).to.equal(VoiceCallEndReasonEnum.OTHER);
    expect(endReasonFromTermination(undefined)).to.equal(VoiceCallEndReasonEnum.OTHER);
  });
});
