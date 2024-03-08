import { expect } from 'chai';
import axios from 'axios';
import { UserSession } from '@novu/testing';
import { MessageRepository, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';

import { TestSendEmailRequestDto } from '../dtos';

const axiosInstance = axios.create();

describe('Events - Test email - /v1/events/test/email (POST)', function () {
  const requestDto: TestSendEmailRequestDto = {
    contentType: 'customHtml',
    payload: {},
    inputs: {},
    subject: 'subject',
    preheader: 'preheader',
    content: '<html><head></head><body>Hello world!</body></html>',
    to: 'to-reply@novu.co',
  };

  let session: UserSession;
  let integrationRepository: IntegrationRepository;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    integrationRepository = new IntegrationRepository();
  });

  const sendTestEmail = async (body: TestSendEmailRequestDto) => {
    return await axiosInstance.post(`${session.serverUrl}/v1/events/test/email`, body, {
      headers: {
        authorization: session.token,
      },
    });
  };

  const deleteEmailIntegration = async () => {
    const emailIntegration = await integrationRepository.findOne({
      channel: ChannelTypeEnum.EMAIL,
      _organizationId: session.organization._id,
    });
    await integrationRepository.delete({ _id: emailIntegration?._id, _organizationId: session.organization._id });
  };

  const deactivateEmailIntegration = async () => {
    const emailIntegration = await integrationRepository.findOne({
      channel: ChannelTypeEnum.EMAIL,
      _environmentId: session.environment._id,
    });
    await integrationRepository.update(
      {
        _id: emailIntegration?._id,
        _environmentId: session.environment._id,
      },
      { active: false }
    );
  };

  const reachNovuProviderLimit = async () => {
    const MAX_NOVU_INTEGRATION_MAIL_REQUESTS = parseInt(process.env.MAX_NOVU_INTEGRATION_MAIL_REQUESTS || '300', 10);
    const messageRepository = new MessageRepository();
    for (let i = 0; i < MAX_NOVU_INTEGRATION_MAIL_REQUESTS; i++) {
      await messageRepository.create({
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        providerId: EmailProviderIdEnum.Novu,
        channel: ChannelTypeEnum.EMAIL,
      });
    }
  };

  it('should allow sending test email with email provider', async function () {
    const response = await sendTestEmail(requestDto);

    expect(response.status).to.equal(201);
  });

  it('should allow sending test email with Novu provider', async function () {
    await deleteEmailIntegration();

    const response = await sendTestEmail(requestDto);

    expect(response.status).to.equal(201);
  });

  it('should send test email fallbacking to Novu provider when there is no active integration', async function () {
    await deactivateEmailIntegration();

    const response = await sendTestEmail(requestDto);

    expect(response.status).to.equal(201);
  });

  it('should not allow sending test email when Novu provider limit is reached', async function () {
    await deleteEmailIntegration();
    await reachNovuProviderLimit();

    try {
      await sendTestEmail(requestDto);
    } catch (e) {
      expect(e.response.status).to.equal(409);
    }
  });
});
