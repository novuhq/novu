import { AGENT_INBOX_EVENTS, EmailProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { ShowHumanAgentCardCommand } from './show-human-agent-card.command';
import { greetingOf, ShowHumanAgentCard } from './show-human-agent-card.usecase';

const ENV_NAMES = [
  'NOVU_ENTERPRISE',
  'IS_SELF_HOSTED',
  'NOVU_AGENT_SHARED_INBOUND_DOMAIN',
  'NOVU_AGENT_INBOX_INBOUND_DOMAIN',
  'HUMAN_DASHBOARD_URL',
] as const;

describe('ShowHumanAgentCard', () => {
  const saved: Partial<Record<(typeof ENV_NAMES)[number], string | undefined>> = {};

  before(() => {
    for (const name of ENV_NAMES) {
      saved[name] = process.env[name];
    }
    process.env.NOVU_ENTERPRISE = 'true';
    delete process.env.IS_SELF_HOSTED;
    process.env.NOVU_AGENT_SHARED_INBOUND_DOMAIN = 'agentconnect.sh';
    process.env.NOVU_AGENT_INBOX_INBOUND_DOMAIN = 'agentinbox.md';
    process.env.HUMAN_DASHBOARD_URL = 'https://agentinbox.md/';
  });

  after(() => {
    for (const name of ENV_NAMES) {
      if (saved[name] === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = saved[name];
      }
    }
  });

  function setup({
    agent = {},
    firstShowing = true,
  }: {
    agent?: Record<string, unknown>;
    firstShowing?: boolean;
  } = {}) {
    const agentRepository = {
      findOne: sinon.stub().resolves({
        _id: 'relay1',
        _environmentId: 'env1',
        _organizationId: 'org1',
        identifier: 'human-relay',
        runtime: 'human_relay',
        name: 'Sid',
        active: true,
        ...agent,
      }),
      update: sinon.stub().resolves({ matched: 1, modified: firstShowing ? 1 : 0 }),
    };
    const agentIntegrationRepository = { find: sinon.stub().resolves([{ _integrationId: 'int1' }]) };
    const integrationRepository = {
      findOne: sinon.stub().resolves({
        _id: 'int1',
        providerId: EmailProviderIdEnum.AgentEmailInbox,
        active: true,
        credentials: { emailSlugPrefix: 'sid', inboxDomain: 'agentinbox.md' },
      }),
    };
    const operatorService = {
      cardNameFor: sinon.stub().resolves({ operatorName: 'Ada L.', operatorFirstName: 'Ada' }),
    };
    const hostStatus = { recordConnected: sinon.stub().resolves() };
    const analyticsService = { track: sinon.stub() };
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const usecase = new ShowHumanAgentCard(
      agentRepository as never,
      agentIntegrationRepository as never,
      integrationRepository as never,
      operatorService as never,
      hostStatus as never,
      analyticsService as never,
      logger as never
    );

    return { usecase, agentRepository, operatorService, hostStatus, analyticsService, logger };
  }

  function command(fields: Partial<ShowHumanAgentCardCommand> = {}) {
    return ShowHumanAgentCardCommand.create({
      environmentId: 'env1',
      organizationId: 'org1',
      userId: 'user1',
      hostVia: 'cli',
      hostId: 'claude-code',
      analyticsSource: 'cli',
      ...fields,
    });
  }

  it('answers with what the agent says, and its name, address, link and look', async () => {
    const { usecase } = setup();

    expect(await usecase.execute(command())).to.deep.equal({
      greeting: 'Hi Ada, I’m Sid. I have my own inbox now. Here’s my card, so people can email or message me directly.',
      name: 'Sid',
      handle: 'sid',
      address: 'sid@agentinbox.md',
      url: 'https://agentinbox.md/p/sid',
      look: { shape: 'orb', color: 'ember', art: { kind: 'rays', seed: 0 } },
      operatorFirstName: 'Ada',
      firstShown: true,
    });
  });

  it('keeps only the first showing, with the host that showed it', async () => {
    const { usecase, agentRepository } = setup({ firstShowing: false });

    const card = await usecase.execute(command({ hostVia: 'mcp', hostId: 'chatgpt' }));

    expect(card.firstShown).to.equal(false);
    const [query, update] = agentRepository.update.firstCall.args;
    expect(query).to.deep.include({ _id: 'relay1', 'cardShown.at': { $exists: false } });
    expect(update.$set.cardShown).to.include({ via: 'mcp', host: 'chatgpt' });
    expect(update.$set.cardShown.at).to.be.a('string');
  });

  it('counts the host that showed the card as connected, and the showing for analytics', async () => {
    const { usecase, hostStatus, analyticsService } = setup();

    await usecase.execute(command());

    expect(hostStatus.recordConnected.firstCall.args[2]).to.deep.equal({ via: 'cli', id: 'claude-code' });
    expect(analyticsService.track.firstCall.args[0]).to.equal(AGENT_INBOX_EVENTS.CARD_SHOWN);
    expect(analyticsService.track.firstCall.args[2]).to.include({ source: 'cli', host: 'claude-code', first: true });
  });

  it('leaves the link out while only its contacts can reach the agent', async () => {
    const { usecase } = setup({ agent: { reach: 'contacts' } });

    const card = await usecase.execute(command());

    expect(card).to.include({ handle: 'sid', address: 'sid@agentinbox.md' });
    expect(card).to.not.have.property('url');
  });

  it('greets the operator without a name when it knows none', async () => {
    const { usecase, operatorService } = setup();
    operatorService.cardNameFor.resolves(undefined);

    const card = await usecase.execute(command());

    expect(card.greeting).to.match(/^Hi, I’m Sid\./);
    expect(card).to.not.have.property('operatorFirstName');
  });

  it('still shows the card when keeping the first showing fails', async () => {
    const { usecase, agentRepository, logger } = setup();
    agentRepository.update.rejects(new Error('mongo is down'));

    const card = await usecase.execute(command());

    expect(card.firstShown).to.equal(false);
    expect(logger.warn.calledOnce).to.equal(true);
  });
});

describe('greetingOf', () => {
  it('says hi to the operator by their first name, and introduces the agent', () => {
    expect(greetingOf('Atlas', 'Naveen')).to.equal(
      'Hi Naveen, I’m Atlas. I have my own inbox now. Here’s my card, so people can email or message me directly.'
    );
  });
});
