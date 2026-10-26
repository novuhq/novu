import { BadGatewayException } from '@nestjs/common';
import { VoiceCallFailureCodeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { deliverToTargets } from './human-interaction-lifecycle';

describe('deliverToTargets', () => {
  it('rethrows a coded voice failure instead of wrapping it as a generic gateway error', async () => {
    const repository = { delete: sinon.stub().resolves(undefined) };
    const logger = { warn: sinon.stub() };

    try {
      await deliverToTargets(
        repository as never,
        logger as never,
        { _id: '1', _environmentId: 'env1', identifier: 'hi_1' } as never,
        [
          {
            subscriberId: 'sub-1',
            integrationIdentifier: 'voice-main',
            platform: 'voice',
            deliver: async () => {
              throw new BadGatewayException({
                code: VoiceCallFailureCodeEnum.INVALID_NUMBER,
                message: 'That phone number is not valid.',
              });
            },
          },
        ],
        { logMessage: 'failed' }
      );
      expect.fail('expected the coded failure');
    } catch (err) {
      expect(err).to.be.instanceOf(BadGatewayException);
      expect((err as BadGatewayException).getResponse()).to.include({
        code: VoiceCallFailureCodeEnum.INVALID_NUMBER,
      });
    }

    expect(repository.delete.calledOnce).to.equal(true);
  });
});
