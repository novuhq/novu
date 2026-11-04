import { VoiceCallFailureCodeEnum } from '@novu/shared';
import { expect } from 'chai';
import { voiceFailureFromDialError, voiceFailureFromInitiation } from './voice-call-failure';

describe('voice call failure reasons', () => {
  const dialCases: Array<[string, VoiceCallFailureCodeEnum]> = [
    ['invalid phone number', VoiceCallFailureCodeEnum.INVALID_NUMBER],
    ['The destination is busy', VoiceCallFailureCodeEnum.BUSY],
    ['no-answer from the carrier', VoiceCallFailureCodeEnum.NO_ANSWER],
    ['callee rejected the call', VoiceCallFailureCodeEnum.REJECTED],
    ['Twilio 500 upstream', VoiceCallFailureCodeEnum.CARRIER_FAILURE],
  ];

  for (const [body, code] of dialCases) {
    it(`maps a dial error "${body}" to ${code}`, () => {
      expect(voiceFailureFromDialError(body).code).to.equal(code);
      expect(voiceFailureFromDialError(body).message).to.be.a('string').and.not.empty;
    });
  }

  it('maps webhook busy, no-answer, decline, a bad number, and an unknown carrier failure', () => {
    expect(voiceFailureFromInitiation({ data: { failure_reason: 'busy' } }).code).to.equal(
      VoiceCallFailureCodeEnum.BUSY
    );
    expect(voiceFailureFromInitiation({ data: { failure_reason: 'no-answer' } }).code).to.equal(
      VoiceCallFailureCodeEnum.NO_ANSWER
    );
    expect(
      voiceFailureFromInitiation({
        data: { failure_reason: 'unknown', metadata: { body: { SipResponseCode: '603' } } },
      }).code
    ).to.equal(VoiceCallFailureCodeEnum.REJECTED);
    expect(
      voiceFailureFromInitiation({
        data: { failure_reason: 'unknown', metadata: { body: { ErrorCode: 21211 } } },
      }).code
    ).to.equal(VoiceCallFailureCodeEnum.INVALID_NUMBER);
    expect(voiceFailureFromInitiation({ data: { failure_reason: 'unknown' } }).code).to.equal(
      VoiceCallFailureCodeEnum.CARRIER_FAILURE
    );
  });
});
