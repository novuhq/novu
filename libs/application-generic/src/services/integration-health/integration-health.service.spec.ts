import { IntegrationEntity } from '@novu/dal';
import {
  ChannelTypeEnum,
  ChatProviderIdEnum,
  EmailProviderIdEnum,
  IntegrationHealthErrorCodeEnum,
  IntegrationHealthStatusEnum,
  SmsProviderIdEnum,
} from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { IntegrationHealthService } from './integration-health.service';

function setup(modified = 1) {
  const integrationRepository = { update: sinon.stub().resolves({ matched: modified, modified }) };
  const logger = { setContext: sinon.stub(), info: sinon.stub(), warn: sinon.stub() };
  const service = new IntegrationHealthService(integrationRepository as any, logger as any);

  return { service, integrationRepository };
}

function integration(overrides: Partial<IntegrationEntity> = {}): IntegrationEntity {
  return {
    _id: 'integration-id',
    _environmentId: 'environment-id',
    _organizationId: 'organization-id',
    providerId: SmsProviderIdEnum.Twilio,
    channel: ChannelTypeEnum.SMS,
    ...overrides,
  } as IntegrationEntity;
}

describe('IntegrationHealthService', () => {
  describe('classifyError', () => {
    it('treats a 401 as invalid credentials', () => {
      expect(IntegrationHealthService.classifyError({ response: { status: 401 } })).to.equal(
        IntegrationHealthErrorCodeEnum.INVALID_CREDENTIALS
      );
      expect(IntegrationHealthService.classifyError({ status: 401, message: 'Authenticate' })).to.equal(
        IntegrationHealthErrorCodeEnum.INVALID_CREDENTIALS
      );
    });

    it('recognises revoked and expired tokens from the provider answer', () => {
      expect(IntegrationHealthService.classifyError(new Error('Slack API Error: token_revoked'))).to.equal(
        IntegrationHealthErrorCodeEnum.TOKEN_REVOKED
      );
      expect(IntegrationHealthService.classifyError({ response: { data: { error: 'token_expired' } } })).to.equal(
        IntegrationHealthErrorCodeEnum.TOKEN_EXPIRED
      );
    });

    it('ignores outages, rate limits, permission and recipient errors', () => {
      for (const error of [
        { response: { status: 500 } },
        { response: { status: 429 } },
        { response: { status: 403 } },
        { code: 'ETIMEDOUT', message: 'timeout' },
        { statusCode: 422, code: 300, message: "Invalid 'To' address" },
        new Error('messaging/registration-token-not-registered'),
      ]) {
        expect(IntegrationHealthService.classifyError(error)).to.equal(undefined);
      }
    });
  });

  describe('recordSendFailure', () => {
    it('marks a healthy integration as error once, with a conditional update', async () => {
      const { service, integrationRepository } = setup();
      const target = integration();

      await service.recordSendFailure(target, { response: { status: 401 } });

      expect(integrationRepository.update.calledOnce).to.equal(true);
      const [query, body, options] = integrationRepository.update.firstCall.args;
      expect(query).to.deep.include({
        _id: 'integration-id',
        _environmentId: 'environment-id',
        _organizationId: 'organization-id',
      });
      expect(query['health.status']).to.deep.equal({ $ne: IntegrationHealthStatusEnum.ERROR });
      expect(body.$set.health.status).to.equal(IntegrationHealthStatusEnum.ERROR);
      expect(options).to.deep.equal({ timestamps: false });
      expect(target.health?.status).to.equal(IntegrationHealthStatusEnum.ERROR);
    });

    it('does no I/O when already in error, for unclassified errors, or for untracked providers', async () => {
      const { service, integrationRepository } = setup();

      await service.recordSendFailure(integration({ health: { status: IntegrationHealthStatusEnum.ERROR } }), {
        response: { status: 401 },
      });
      await service.recordSendFailure(integration(), { response: { status: 500 } });
      await service.recordSendFailure(
        integration({ providerId: EmailProviderIdEnum.Novu, channel: ChannelTypeEnum.EMAIL }),
        { response: { status: 401 } }
      );
      await service.recordSendFailure(
        integration({ providerId: ChatProviderIdEnum.Slack, channel: ChannelTypeEnum.CHAT }),
        new Error('token_revoked')
      );

      expect(integrationRepository.update.called).to.equal(false);
    });

    it('never throws when the write fails', async () => {
      const { service, integrationRepository } = setup();
      integrationRepository.update.rejects(new Error('mongo down'));

      await service.recordSendFailure(integration(), { response: { status: 401 } });
    });
  });

  describe('recordSendSuccess', () => {
    it('does no I/O for a healthy integration', async () => {
      const { service, integrationRepository } = setup();

      await service.recordSendSuccess(integration());
      await service.recordSendSuccess(integration({ health: { status: IntegrationHealthStatusEnum.HEALTHY } }));

      expect(integrationRepository.update.called).to.equal(false);
    });

    it('clears an error', async () => {
      const { service, integrationRepository } = setup();

      await service.recordSendSuccess(integration({ health: { status: IntegrationHealthStatusEnum.ERROR } }));

      const [query, body] = integrationRepository.update.firstCall.args;
      expect(query['health.status']).to.equal(IntegrationHealthStatusEnum.ERROR);
      expect(body.$set.health.status).to.equal(IntegrationHealthStatusEnum.HEALTHY);
    });
  });
});
