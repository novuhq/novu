import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { ChatSdkService } from './chat-sdk.service';

describe('ChatSdkService', () => {
  describe('buildSendEmailCallback', () => {
    it('should skip custom MIME alternatives for unsupported outbound providers', async () => {
      const logger = {
        warn: sinon.stub(),
        error: sinon.stub(),
        debug: sinon.stub(),
        info: sinon.stub(),
      };
      const integrationRepository = {
        findOne: sinon.stub().resolves({
          _id: 'outbound-integration-id',
          _environmentId: 'env-id',
          _organizationId: 'org-id',
          providerId: EmailProviderIdEnum.Resend,
          channel: ChannelTypeEnum.EMAIL,
          credentials: {},
          active: true,
        }),
      };
      const service = new ChatSdkService(logger as any, {} as any, {} as any, {} as any, integrationRepository as any);
      const sendEmail = (service as any).buildSendEmailCallback(
        {
          environmentId: 'env-id',
          organizationId: 'org-id',
          credentials: {},
        },
        'outbound-integration-id'
      );

      const result = await sendEmail({
        from: 'agent@example.com',
        to: 'user@gmail.com',
        subject: 'Re: Hello',
        text: '👀',
        html: '<p>👀</p>',
        alternatives: [
          {
            contentType: 'text/vnd.google.email-reaction+json',
            content: JSON.stringify({ version: 1, emoji: '👀' }),
          },
        ],
        messageId: '<reaction@example.com>',
        inReplyTo: '<original@example.com>',
        references: '<original@example.com>',
      });

      expect(result).to.deep.equal({ messageId: '<reaction@example.com>' });
      expect(logger.warn.calledOnce).to.equal(true);
      expect(logger.warn.firstCall.args[0]).to.deep.equal({
        providerId: EmailProviderIdEnum.Resend,
        outboundIntegrationId: 'outbound-integration-id',
      });
      expect(logger.warn.firstCall.args[1]).to.include('does not support custom MIME alternatives');
      expect(
        integrationRepository.findOne.calledOnceWithMatch({
          _id: 'outbound-integration-id',
          channel: ChannelTypeEnum.EMAIL,
        })
      ).to.equal(true);
    });

    it('should not claim success when unsupported MIME alternatives omit messageId', async () => {
      const logger = {
        warn: sinon.stub(),
        error: sinon.stub(),
        debug: sinon.stub(),
        info: sinon.stub(),
      };
      const integrationRepository = {
        findOne: sinon.stub().resolves({
          _id: 'outbound-integration-id',
          _environmentId: 'env-id',
          _organizationId: 'org-id',
          providerId: EmailProviderIdEnum.Resend,
          channel: ChannelTypeEnum.EMAIL,
          credentials: {},
          active: true,
        }),
      };
      const service = new ChatSdkService(logger as any, {} as any, {} as any, {} as any, integrationRepository as any);
      const sendEmail = (service as any).buildSendEmailCallback(
        {
          environmentId: 'env-id',
          organizationId: 'org-id',
          credentials: {},
        },
        'outbound-integration-id'
      );

      const result = await sendEmail({
        from: 'agent@example.com',
        to: 'user@gmail.com',
        subject: 'Re: Hello',
        text: '👀',
        html: '<p>👀</p>',
        alternatives: [
          {
            contentType: 'text/vnd.google.email-reaction+json',
            content: JSON.stringify({ version: 1, emoji: '👀' }),
          },
        ],
      });

      expect(result).to.deep.equal({ messageId: undefined });
      expect(logger.warn.calledOnce).to.equal(true);
      expect(logger.warn.firstCall.args[0]).to.deep.equal({
        providerId: EmailProviderIdEnum.Resend,
        outboundIntegrationId: 'outbound-integration-id',
      });
      expect(logger.warn.firstCall.args[1]).to.include('no messageId was supplied');
    });
  });
});
