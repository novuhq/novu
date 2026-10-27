import { expect } from 'chai';
import sinon from 'sinon';

import { ConsumeSlackSetupLinkCommand } from './consume-slack-setup-link.command';
import { ConsumeSlackSetupLink } from './consume-slack-setup-link.usecase';

describe('ConsumeSlackSetupLink', () => {
  const token = 'a'.repeat(32);
  const configToken = 'xoxe.xoxp-test';
  const envId = '507f1f77bcf86cd799439011';
  const orgId = '507f1f77bcf86cd799439012';
  const integrationId = '507f1f77bcf86cd799439013';
  const agentId = '507f1f77bcf86cd799439014';

  function makeUsecase(sid?: string) {
    const payload = {
      kind: 'slack-agent-setup',
      env: envId,
      org: orgId,
      aid: 'agent-1',
      iid: integrationId,
      ...(sid ? { sid } : {}),
    };
    const tokenService = {
      claim: sinon.stub().resolves({ payload, expiresAt: Date.now() + 60_000 }),
      release: sinon.stub().resolves(),
    };
    const agentRepository = {
      findOne: sinon.stub().resolves({ _id: agentId }),
    };
    const integrationRepository = {
      findOne: sinon.stub().resolves({ _id: integrationId, providerId: 'slack', identifier: 'slack-int' }),
    };
    const slackQuickSetupUsecase = {
      execute: sinon.stub().resolves(),
    };
    const generateConnectOauthUrlUsecase = {
      execute: sinon.stub().resolves('https://slack.com/oauth/authorize'),
    };
    const logger = {
      setContext: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
    };

    const usecase = new ConsumeSlackSetupLink(
      tokenService as any,
      agentRepository as any,
      integrationRepository as any,
      slackQuickSetupUsecase as any,
      generateConnectOauthUrlUsecase as any,
      logger as any
    );

    return { usecase, tokenService, generateConnectOauthUrlUsecase, logger };
  }

  function command() {
    return ConsumeSlackSetupLinkCommand.create({ token, configToken });
  }

  it('returns the Slack install URL when the setup token is bound to a subscriber', async () => {
    const { usecase, generateConnectOauthUrlUsecase } = makeUsecase('sub-1');

    const result = await usecase.execute(command());

    expect(result).to.deep.equal({ success: true, authorizeUrl: 'https://slack.com/oauth/authorize' });
    const oauthCommand = generateConnectOauthUrlUsecase.execute.firstCall.args[0];
    expect(oauthCommand.subscriberId).to.equal('sub-1');
    expect(oauthCommand.integrationIdentifier).to.equal('slack-int');
    expect(oauthCommand.connectionMode).to.equal('subscriber');
    expect(oauthCommand.autoLinkUser).to.equal(true);
  });

  it('omits the install URL when no subscriber was bound', async () => {
    const { usecase, generateConnectOauthUrlUsecase } = makeUsecase();

    const result = await usecase.execute(command());

    expect(result).to.deep.equal({ success: true });
    expect(generateConnectOauthUrlUsecase.execute.called).to.equal(false);
  });

  it('still succeeds when the install URL cannot be built', async () => {
    const { usecase, tokenService, generateConnectOauthUrlUsecase } = makeUsecase('sub-1');
    generateConnectOauthUrlUsecase.execute.rejects(new Error('oauth down'));

    const result = await usecase.execute(command());

    expect(result).to.deep.equal({ success: true });
    expect(tokenService.release.called).to.equal(false);
  });
});
