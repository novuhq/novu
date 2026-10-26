import { expect } from 'chai';
import sinon from 'sinon';
import { HumanListenAccessService } from './human-listen-access.service';

describe('HumanListenAccessService', () => {
  const scope = { environmentId: 'env1', organizationId: 'org1' };
  const agent = { _id: 'relay1' };
  const STRANGER_DATA = { __novu_source: 'agent-platform-provision', __novu_platform: 'telegram' };

  function setup({
    operatorId = 'ada' as string | null,
    allowed = [] as string[],
    subscribers = [] as Array<{ subscriberId: string; firstName?: string; lastName?: string; data?: object }>,
  } = {}) {
    const humanOperator = { findForAgent: sinon.stub().resolves(operatorId) };
    const humanContactRepository = {
      findListenToSubscriberIds: sinon.stub().resolves(allowed),
      find: sinon
        .stub()
        .callsFake(async (query: { subscriberId: { $in: string[] } }) =>
          allowed.filter((id) => query.subscriberId.$in.includes(id)).map((subscriberId) => ({ subscriberId }))
        ),
    };
    const subscriberRepository = {
      find: sinon
        .stub()
        .callsFake(async (query: { subscriberId: { $in: string[] } }) =>
          subscribers.filter((subscriber) => query.subscriberId.$in.includes(subscriber.subscriberId))
        ),
    };
    const service = new HumanListenAccessService(
      humanOperator as never,
      humanContactRepository as never,
      subscriberRepository as never
    );

    return { service, humanOperator, humanContactRepository, subscriberRepository };
  }

  it('listens to the operator without a switch, and to the contacts whose switch is on', async () => {
    const { service } = setup({
      allowed: ['bob'],
      subscribers: [
        { subscriberId: 'ada', firstName: 'Ada', lastName: 'Lovelace' },
        { subscriberId: 'bob', firstName: 'Bob' },
        { subscriberId: 'carol', firstName: 'Carol' },
      ],
    });

    const listenedTo = await service.whoIsListenedTo(scope, agent);

    expect([...listenedTo.values()]).to.deep.equal([
      { id: 'ada', name: 'Ada Lovelace', isOperator: true },
      { id: 'bob', name: 'Bob', isOperator: false },
    ]);
  });

  it('never listens to a stranger, whatever their switch says, nor to a contact who is gone', async () => {
    const { service } = setup({
      allowed: ['phantom', 'gone'],
      subscribers: [{ subscriberId: 'ada' }, { subscriberId: 'phantom', data: STRANGER_DATA }],
    });

    const listenedTo = await service.whoIsListenedTo(scope, agent);

    expect([...listenedTo.keys()]).to.deep.equal(['ada']);
    expect(listenedTo.get('ada')).to.deep.equal({ id: 'ada', isOperator: true });
  });

  it('listens to nobody before there is an operator or a contact with the switch on', async () => {
    const { service, subscriberRepository } = setup({ operatorId: null });

    expect((await service.whoIsListenedTo(scope, agent)).size).to.equal(0);
    expect(subscriberRepository.find.called).to.equal(false);
  });

  it('answers for the people asked about only', async () => {
    const { service } = setup({
      allowed: ['bob'],
      subscribers: [{ subscriberId: 'ada' }, { subscriberId: 'bob' }, { subscriberId: 'carol' }],
    });

    expect([...(await service.whichAreListenedTo(scope, agent, ['bob', 'carol', 'bob'])).keys()]).to.deep.equal([
      'bob',
    ]);
    expect(await service.listenTo(scope, agent, 'ada')).to.equal(true);
    expect(await service.listenTo(scope, agent, 'carol')).to.equal(false);
    expect((await service.whichAreListenedTo(scope, agent, [])).size).to.equal(0);
  });

  it('reads the operator and the switches of the agent asked about, in its own environment', async () => {
    const { service, humanOperator, humanContactRepository, subscriberRepository } = setup({
      subscribers: [{ subscriberId: 'ada' }],
    });

    await service.whoIsListenedTo(scope, agent);

    expect(humanOperator.findForAgent.firstCall.args[0]).to.deep.equal({ ...scope, agentId: 'relay1' });
    expect(humanContactRepository.findListenToSubscriberIds.firstCall.args).to.deep.equal(['env1', 'relay1']);
    expect(subscriberRepository.find.firstCall.args[0]).to.deep.include({
      _environmentId: 'env1',
      _organizationId: 'org1',
    });
  });
});
