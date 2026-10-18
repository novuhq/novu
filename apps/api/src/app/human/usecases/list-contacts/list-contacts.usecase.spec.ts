import type { HumanContactChannelAddresses } from '@novu/dal';
import { HumanAddressVerificationStateEnum, HumanChannelViaEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { ListContactsCommand } from './list-contacts.command';
import { ListContacts } from './list-contacts.usecase';

const DATES = { createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z' };

describe('ListContacts', () => {
  function setup({
    subscribers,
    targets = new Map(),
    storedEmails = {},
    operatorId = null,
    agent = { _id: 'agent-1' },
  }: {
    subscribers: Array<{ subscriberId: string; email?: string }>;
    targets?: Map<string, { targets: unknown[]; defaultVia?: HumanChannelViaEnum }>;
    storedEmails?: Record<string, HumanContactChannelAddresses>;
    operatorId?: string | null;
    agent?: { _id: string } | null;
  }) {
    const humanContactRepository = {
      find: sinon.stub().resolves(
        Object.entries(storedEmails).map(([subscriberId, email]) => ({
          subscriberId,
          addresses: { [HumanChannelViaEnum.EMAIL]: email },
        }))
      ),
    };
    const humanOperator = { findForAgent: sinon.stub().resolves(operatorId) };
    const usecase = new ListContacts(
      {
        listSubscribers: sinon.stub().resolves({
          subscribers: subscribers.map((subscriber) => ({ ...subscriber, ...DATES })),
          next: null,
        }),
      } as never,
      { findOne: sinon.stub().resolves(agent) } as never,
      { describeReachabilityForMany: sinon.stub().resolves(targets) } as never,
      { findPending: sinon.stub().resolves(new Map()) } as never,
      humanContactRepository as never,
      humanOperator as never
    );

    return { usecase, humanContactRepository, humanOperator };
  }

  async function list(usecase: ListContacts) {
    const page = await usecase.execute(
      ListContactsCommand.create({ environmentId: 'env-1', organizationId: 'org-1', userId: 'user-1' })
    );

    return new Map(page.data.map((contact) => [contact.id, contact]));
  }

  it('reports the address verified for this relay, not the shared subscriber email', async () => {
    const { usecase } = setup({
      subscribers: [{ subscriberId: 'alice', email: 'shared@example.com' }],
      targets: new Map([
        [
          'alice',
          {
            targets: [
              {
                via: HumanChannelViaEnum.EMAIL,
                platform: HumanChannelViaEnum.EMAIL,
                platformUserId: 'relay-a@example.com',
                integrationIdentifier: 'email-main',
                connectedAt: '2026-10-02T00:00:00.000Z',
              },
            ],
            defaultVia: HumanChannelViaEnum.EMAIL,
          },
        ],
      ]),
      storedEmails: {
        alice: {
          verified: {
            address: 'relay-a@example.com',
            requestedAt: '2026-10-01T23:55:00.000Z',
            verifiedAt: '2026-10-02T00:00:00.000Z',
          },
        },
      },
    });

    const alice = (await list(usecase)).get('alice');

    expect(alice?.email).to.equal('shared@example.com');
    expect(alice?.channels[0]).to.deep.include({
      via: HumanChannelViaEnum.EMAIL,
      address: 'relay-a@example.com',
    });
    expect(alice?.emailVerification).to.deep.equal({
      address: 'relay-a@example.com',
      status: HumanAddressVerificationStateEnum.VERIFIED,
      verifiedAt: '2026-10-02T00:00:00.000Z',
    });
  });

  it('says how far each email got: a change waiting, a link out, typed only, or on the profile', async () => {
    const { usecase, humanContactRepository } = setup({
      subscribers: [
        { subscriberId: 'changing' },
        { subscriberId: 'resent' },
        { subscriberId: 'waiting' },
        { subscriberId: 'typed', email: 'profile@example.com' },
        { subscriberId: 'profile', email: 'profile@example.com' },
        { subscriberId: 'nothing' },
      ],
      storedEmails: {
        changing: {
          verified: {
            address: 'old@example.com',
            requestedAt: '2026-10-01T00:00:00.000Z',
            verifiedAt: '2026-10-01T00:01:00.000Z',
          },
          pending: { address: 'new@example.com', requestedAt: '2026-10-03T00:00:00.000Z' },
        },
        resent: {
          verified: {
            address: 'same@example.com',
            requestedAt: '2026-10-01T00:00:00.000Z',
            verifiedAt: '2026-10-01T00:01:00.000Z',
          },
          pending: { address: 'same@example.com', requestedAt: '2026-10-03T00:00:00.000Z' },
        },
        waiting: {
          pending: { address: 'waiting@example.com', requestedAt: '2026-10-03T00:00:00.000Z' },
          declared: { address: 'typed@example.com', declaredAt: '2026-10-02T00:00:00.000Z' },
        },
        typed: { declared: { address: 'typed@example.com', declaredAt: '2026-10-02T00:00:00.000Z' } },
      },
    });

    const contacts = await list(usecase);

    expect(humanContactRepository.find.firstCall.args[0]).to.deep.equal({
      _environmentId: 'env-1',
      _agentId: 'agent-1',
      subscriberId: { $in: ['changing', 'resent', 'waiting', 'typed', 'profile', 'nothing'] },
    });
    expect(contacts.get('changing')?.emailVerification).to.deep.equal({
      address: 'old@example.com',
      status: HumanAddressVerificationStateEnum.VERIFIED,
      verifiedAt: '2026-10-01T00:01:00.000Z',
      pending: { address: 'new@example.com', requestedAt: '2026-10-03T00:00:00.000Z' },
    });
    expect(contacts.get('resent')?.emailVerification).to.not.have.property('pending');
    expect(contacts.get('waiting')?.emailVerification).to.deep.equal({
      address: 'waiting@example.com',
      status: HumanAddressVerificationStateEnum.PENDING,
      pending: { address: 'waiting@example.com', requestedAt: '2026-10-03T00:00:00.000Z' },
    });
    expect(contacts.get('typed')?.emailVerification).to.deep.equal({
      address: 'typed@example.com',
      status: HumanAddressVerificationStateEnum.UNVERIFIED,
    });
    expect(contacts.get('profile')?.emailVerification).to.deep.equal({
      address: 'profile@example.com',
      status: HumanAddressVerificationStateEnum.UNVERIFIED,
    });
    expect(contacts.get('nothing')).to.not.have.property('emailVerification');
  });

  it("marks the operator's own contact", async () => {
    const { usecase, humanOperator } = setup({
      subscribers: [{ subscriberId: 'maya' }, { subscriberId: 'dima' }],
      operatorId: 'dima',
    });

    const contacts = await list(usecase);

    expect(humanOperator.findForAgent.firstCall.args[0]).to.deep.equal({
      environmentId: 'env-1',
      organizationId: 'org-1',
      agentId: 'agent-1',
    });
    expect(contacts.get('dima')?.isOperator).to.equal(true);
    expect(contacts.get('maya')?.isOperator).to.equal(false);
  });

  it('has no operator and only profile emails before the relay agent exists', async () => {
    const { usecase, humanOperator, humanContactRepository } = setup({
      subscribers: [{ subscriberId: 'bob', email: 'bob@example.com' }],
      agent: null,
    });

    const bob = (await list(usecase)).get('bob');

    expect(bob?.isOperator).to.equal(false);
    expect(bob?.emailVerification).to.deep.equal({
      address: 'bob@example.com',
      status: HumanAddressVerificationStateEnum.UNVERIFIED,
    });
    expect(humanOperator.findForAgent.called).to.equal(false);
    expect(humanContactRepository.find.called).to.equal(false);
  });
});
