import { BadGatewayException } from '@nestjs/common';
import { ChatProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { ConsumeTelegramMobileLinkCommand } from './consume-telegram-mobile-link.command';
import { ConsumeTelegramMobileLink } from './consume-telegram-mobile-link.usecase';

const TOKEN = 'setup-token';
const BOT_TOKEN = `12345678:${'a'.repeat(35)}`;

describe('ConsumeTelegramMobileLink', () => {
  const claimed = { payload: { iid: 'integration-1', env: 'env-1', org: 'org-1', sid: 'subscriber-1' } };

  function makeUsecase({
    credentials = {},
    configure = sinon.stub().resolves({ botUsername: 'atlas_bot', webhookUrl: 'https://api.test/webhook' }),
    update = sinon.stub().resolves({ matched: 1, modified: 1 }),
  }: {
    credentials?: Record<string, string>;
    configure?: sinon.SinonStub;
    update?: sinon.SinonStub;
  } = {}) {
    const tokenService = { claim: sinon.stub().resolves(claimed), release: sinon.stub().resolves() };
    const integrationRepository = {
      findOne: sinon.stub().resolves({
        _id: 'integration-1',
        identifier: 'telegram-atlas',
        providerId: ChatProviderIdEnum.Telegram,
        credentials,
      }),
      update,
    };
    const issueSubscriberLink = {
      execute: sinon.stub().resolves({ deepLinkUrl: 'https://t.me/atlas_bot?start=code' }),
    };
    const logger = { setContext: sinon.stub(), warn: sinon.stub(), error: sinon.stub() };

    const usecase = new ConsumeTelegramMobileLink(
      tokenService as any,
      integrationRepository as any,
      { execute: configure } as any,
      issueSubscriberLink as any,
      logger as any
    );

    return { usecase, tokenService, logger };
  }

  const consume = (usecase: ConsumeTelegramMobileLink) =>
    usecase.execute(ConsumeTelegramMobileLinkCommand.create({ token: TOKEN, botToken: BOT_TOKEN }));

  async function failure(usecase: ConsumeTelegramMobileLink): Promise<unknown> {
    try {
      await consume(usecase);
    } catch (err) {
      return err;
    }

    throw new Error('Expected the setup to fail');
  }

  it('keeps the token when Telegram takes the webhook', async () => {
    const update = sinon.stub().resolves({ matched: 1, modified: 1 });
    const { usecase, tokenService } = makeUsecase({ update });

    const result = await consume(usecase);

    expect(result.deepLinkUrl).to.equal('https://t.me/atlas_bot?start=code');
    expect(update.calledOnce).to.equal(true);
    expect(tokenService.release.called).to.equal(false);
  });

  describe('when Telegram turns the webhook down', () => {
    const refused = new BadGatewayException('Telegram rejected the webhook registration: Unauthorized');

    it('takes a new token back out, so the next try starts from the setup page', async () => {
      const update = sinon.stub().resolves({ matched: 1, modified: 1 });
      const { usecase } = makeUsecase({ update, configure: sinon.stub().rejects(refused) });

      await failure(usecase);

      const [, saved] = update.firstCall.args;
      const [filter, undo] = update.secondCall.args;
      expect(filter).to.deep.equal({
        _id: 'integration-1',
        _environmentId: 'env-1',
        _organizationId: 'org-1',
        'credentials.apiToken': saved.$set['credentials.apiToken'],
      });
      expect(undo).to.deep.equal({ $unset: { 'credentials.apiToken': '' } });
    });

    it('puts back the token that was there before', async () => {
      const update = sinon.stub().resolves({ matched: 1, modified: 1 });
      const { usecase } = makeUsecase({
        update,
        credentials: { apiToken: 'earlier-encrypted-token' },
        configure: sinon.stub().rejects(refused),
      });

      await failure(usecase);

      expect(update.secondCall.args[1]).to.deep.equal({ $set: { 'credentials.apiToken': 'earlier-encrypted-token' } });
    });

    it('gives the link back and passes on what Telegram said', async () => {
      const { usecase, tokenService } = makeUsecase({ configure: sinon.stub().rejects(refused) });

      expect(await failure(usecase)).to.equal(refused);
      expect(tokenService.release.calledOnceWith(TOKEN, claimed)).to.equal(true);
    });

    it('still passes on what Telegram said when the token cannot be taken back', async () => {
      const update = sinon.stub();
      update.onFirstCall().resolves({ matched: 1, modified: 1 });
      update.onSecondCall().rejects(new Error('database down'));
      const { usecase, tokenService, logger } = makeUsecase({ update, configure: sinon.stub().rejects(refused) });

      expect(await failure(usecase)).to.equal(refused);
      expect(tokenService.release.calledOnce).to.equal(true);
      expect(logger.error.calledOnce).to.equal(true);
    });
  });
});
