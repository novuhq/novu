import { BadGatewayException, BadRequestException, ConflictException } from '@nestjs/common';
import { AGENT_INBOX_EVENTS, HumanChannelViaEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { ConnectHumanInviteChannelCommand } from './connect-human-invite-channel.command';
import { ConnectHumanInviteChannel } from './connect-human-invite-channel.usecase';

describe('ConnectHumanInviteChannel', () => {
  function setup(channels: Array<{ via: HumanChannelViaEnum; integrationIdentifier: string; connected: boolean }>) {
    const inviteTokens = {
      requireActive: sinon.stub().resolves({
        payload: { env: 'env1', org: 'org1', agentId: 'relay1', subscriberId: 'alice' },
        expiresAt: '2026-10-02T10:00:00.000Z',
      }),
    };
    const deliveryService = {
      describeInviteChannels: sinon
        .stub()
        .resolves(channels.map((channel) => ({ ...channel, isDefault: false, available: true }))),
    };
    const issueTelegramSubscriberLink = {
      execute: sinon.stub().resolves({ deepLinkUrl: 'https://t.me/bot?start=code', botUsername: 'bot', expiresAt: '' }),
    };
    const generateConnectOauthUrl = { execute: sinon.stub().resolves('https://slack.com/oauth/v2/authorize?x=1') };
    const requestAddressVerification = {
      execute: sinon.stub().resolves({
        address: 'a***@example.com',
        requestedAt: '2026-10-01T10:00:00.000Z',
        expiresAt: '2026-10-02T10:00:00.000Z',
        retryAfterSeconds: 60,
        replacesVerifiedAddress: false,
      }),
    };
    const environmentRepository = { findOne: sinon.stub().resolves({ apiKeys: [{ _userId: 'owner1' }] }) };
    const analyticsService = { track: sinon.stub() };
    const usecase = new ConnectHumanInviteChannel(
      inviteTokens as never,
      deliveryService as never,
      issueTelegramSubscriberLink as never,
      generateConnectOauthUrl as never,
      requestAddressVerification as never,
      environmentRepository as never,
      analyticsService as never
    );

    return {
      usecase,
      issueTelegramSubscriberLink,
      generateConnectOauthUrl,
      requestAddressVerification,
      environmentRepository,
      analyticsService,
    };
  }

  /** Lets the count that runs in the background finish. */
  const settle = () => new Promise((resolve) => setImmediate(resolve));

  const both = [
    { via: HumanChannelViaEnum.TELEGRAM, integrationIdentifier: 'tg', connected: false },
    { via: HumanChannelViaEnum.SLACK, integrationIdentifier: 'slack', connected: false },
  ];

  it('mints a fresh Telegram deep link for the invited subscriber', async () => {
    const { usecase, issueTelegramSubscriberLink } = setup(both);

    const result = await usecase.execute(
      ConnectHumanInviteChannelCommand.create({ token: 'T'.repeat(32), via: HumanChannelViaEnum.TELEGRAM })
    );

    expect(result).to.deep.equal({ url: 'https://t.me/bot?start=code' });
    expect(issueTelegramSubscriberLink.execute.firstCall.args[0]).to.include({
      environmentId: 'env1',
      organizationId: 'org1',
      integrationIdentifier: 'tg',
      subscriberId: 'alice',
    });
  });

  it('mints the same Slack install link as `human contact invite --via slack`', async () => {
    const { usecase, generateConnectOauthUrl } = setup(both);

    const result = await usecase.execute(
      ConnectHumanInviteChannelCommand.create({ token: 'T'.repeat(32), via: HumanChannelViaEnum.SLACK })
    );

    expect(result).to.deep.equal({ url: 'https://slack.com/oauth/v2/authorize?x=1' });
    expect(generateConnectOauthUrl.execute.firstCall.args[0]).to.include({
      integrationIdentifier: 'slack',
      subscriberId: 'alice',
      connectionMode: 'subscriber',
      autoLinkUser: true,
    });
  });

  it('counts the accepted invite for the owner: the user the environment has its key from', async () => {
    const { usecase, environmentRepository, analyticsService } = setup(both);

    await usecase.execute(
      ConnectHumanInviteChannelCommand.create({ token: 'T'.repeat(32), via: HumanChannelViaEnum.TELEGRAM })
    );
    await settle();

    expect(environmentRepository.findOne.firstCall.args[0]).to.deep.equal({ _id: 'env1', _organizationId: 'org1' });
    expect(analyticsService.track.args).to.deep.equal([
      [AGENT_INBOX_EVENTS.INVITE_ACCEPTED, 'owner1', { _organization: 'org1', agentId: 'relay1', channel: 'telegram' }],
    ]);
  });

  it('still answers when the owner cannot be looked up', async () => {
    const { usecase, environmentRepository, analyticsService } = setup(both);
    environmentRepository.findOne.rejects(new Error('mongo down'));

    const result = await usecase.execute(
      ConnectHumanInviteChannelCommand.create({ token: 'T'.repeat(32), via: HumanChannelViaEnum.SLACK })
    );
    await settle();

    expect(result).to.deep.equal({ url: 'https://slack.com/oauth/v2/authorize?x=1' });
    expect(analyticsService.track.called).to.equal(false);
  });

  it('refuses apps the inviter has not set up', async () => {
    const { usecase, analyticsService } = setup([both[0]]);

    const err = await usecase
      .execute(ConnectHumanInviteChannelCommand.create({ token: 'T'.repeat(32), via: HumanChannelViaEnum.SLACK }))
      .catch((error) => error);
    await settle();

    expect(err).to.be.instanceOf(BadRequestException);
    expect((err as BadRequestException).getResponse()).to.include({ code: 'channel_unavailable' });
    expect(analyticsService.track.called).to.equal(false);
  });

  it('refuses an app the invitee is already connected on', async () => {
    const { usecase, issueTelegramSubscriberLink } = setup([{ ...both[0], connected: true }]);

    const err = await usecase
      .execute(ConnectHumanInviteChannelCommand.create({ token: 'T'.repeat(32), via: HumanChannelViaEnum.TELEGRAM }))
      .catch((error) => error);

    expect(err).to.be.instanceOf(ConflictException);
    expect((err as ConflictException).getResponse()).to.include({ code: 'channel_already_connected' });
    expect(issueTelegramSubscriberLink.execute.called).to.equal(false);
  });

  it('starts email verification instead of minting a URL', async () => {
    const { usecase, requestAddressVerification } = setup([
      { via: HumanChannelViaEnum.EMAIL, integrationIdentifier: 'email-1', connected: false },
    ]);

    const result = await usecase.execute(
      ConnectHumanInviteChannelCommand.create({
        token: 'T'.repeat(32),
        via: HumanChannelViaEnum.EMAIL,
        address: 'alice@example.com',
      })
    );

    expect(result).to.deep.equal({
      via: HumanChannelViaEnum.EMAIL,
      address: 'a***@example.com',
      requestedAt: '2026-10-01T10:00:00.000Z',
      expiresAt: '2026-10-02T10:00:00.000Z',
      retryAfterSeconds: 60,
      replacesVerifiedAddress: false,
    });
    expect(requestAddressVerification.execute.firstCall.args[0]).to.include({
      environmentId: 'env1',
      organizationId: 'org1',
      agentId: 'relay1',
      subscriberId: 'alice',
      address: 'alice@example.com',
    });
  });

  it('hides mail-provider errors from the public invite connect path', async () => {
    const { usecase, requestAddressVerification } = setup([
      { via: HumanChannelViaEnum.EMAIL, integrationIdentifier: 'email-1', connected: false },
    ]);
    requestAddressVerification.execute.rejects(
      new BadGatewayException({
        error: 'delivery_failed',
        message: 'Unauthorized: The from address is not a verified sender identity.',
      })
    );

    const err = await usecase
      .execute(
        ConnectHumanInviteChannelCommand.create({
          token: 'T'.repeat(32),
          via: HumanChannelViaEnum.EMAIL,
          address: 'alice@example.com',
        })
      )
      .catch((error) => error);

    expect(err).to.be.instanceOf(BadGatewayException);
    expect((err as BadGatewayException).getResponse()).to.deep.equal({
      error: 'delivery_failed',
      message: 'Could not send the verification email. Try again in a moment.',
    });
  });
});
