import { SubscriberRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

const subscriberRepository = new SubscriberRepository();

describe('Human contacts (setup names → list) #novu-v2', () => {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  async function setup(body: Record<string, unknown>) {
    const res = await session.testAgent.post('/v1/human/setup').send(body);
    expect(res.status).to.equal(200, JSON.stringify(res.body));

    return res.body.data as { subscriberId: string };
  }

  async function findSubscriber(subscriberId: string) {
    return subscriberRepository.findOne({ subscriberId, _environmentId: session.environment._id });
  }

  describe('POST /v1/human/setup names', () => {
    it('creates the subscriber with firstName and lastName', async () => {
      const subscriberId = `contact-${Date.now()}`;
      await setup({ subscriberId, firstName: 'Alice', lastName: 'Chen' });

      const subscriber = await findSubscriber(subscriberId);
      expect(subscriber?.firstName).to.equal('Alice');
      expect(subscriber?.lastName).to.equal('Chen');
    });

    it('replaces the name on re-setup and keeps it when omitted', async () => {
      const subscriberId = `contact-${Date.now()}`;
      await setup({ subscriberId, firstName: 'Alice' });
      await setup({ subscriberId, firstName: 'Alicia', lastName: 'Chen' });

      let subscriber = await findSubscriber(subscriberId);
      expect(subscriber?.firstName).to.equal('Alicia');
      expect(subscriber?.lastName).to.equal('Chen');

      await setup({ subscriberId });
      subscriber = await findSubscriber(subscriberId);
      expect(subscriber?.firstName).to.equal('Alicia');
      expect(subscriber?.lastName).to.equal('Chen');
    });
  });

  describe('GET /v1/human/contacts', () => {
    it('lists every subscriber in the environment with only contact fields', async () => {
      const stamp = Date.now();
      await setup({ subscriberId: `alice-${stamp}`, firstName: 'Alice', lastName: 'Chen' });
      await setup({ subscriberId: `bob-${stamp}`, email: 'bob@example.com' });
      await subscriberRepository.create({
        subscriberId: `carol-${stamp}`,
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        phone: '+15550000000',
        data: { role: 'on-call' },
      });

      const res = await session.testAgent.get('/v1/human/contacts');
      expect(res.status).to.equal(200, JSON.stringify(res.body));

      const rows = res.body.data as Array<Record<string, unknown>>;
      const byId = new Map(rows.map((row) => [row.subscriberId as string, row]));
      expect(byId.has(`alice-${stamp}`)).to.equal(true);
      expect(byId.has(`bob-${stamp}`)).to.equal(true);
      expect(byId.has(`carol-${stamp}`)).to.equal(true);

      const alice = byId.get(`alice-${stamp}`);
      expect(alice?.firstName).to.equal('Alice');
      expect(alice?.lastName).to.equal('Chen');
      expect(byId.get(`bob-${stamp}`)?.email).to.equal('bob@example.com');

      const carol = byId.get(`carol-${stamp}`);
      expect(carol?.phone).to.equal('+15550000000');
      expect(carol?.data).to.deep.equal({ role: 'on-call' });
      expect(carol?.createdAt).to.be.a('string');
      expect(carol?.updatedAt).to.be.a('string');

      const allowedKeys = new Set([
        'subscriberId',
        'firstName',
        'lastName',
        'email',
        'phone',
        'data',
        'createdAt',
        'updatedAt',
      ]);
      for (const row of rows) {
        for (const key of Object.keys(row)) {
          expect(allowedKeys.has(key), `unexpected contact field "${key}"`).to.equal(true);
        }
      }
    });

    it('pages with limit and after', async () => {
      const stamp = Date.now();
      await setup({ subscriberId: `p1-${stamp}` });
      await setup({ subscriberId: `p2-${stamp}` });

      const first = await session.testAgent.get('/v1/human/contacts').query({ limit: 1 });
      expect(first.status).to.equal(200);
      expect(first.body.data).to.have.length(1);
      expect(first.body.next).to.be.a('string');

      const second = await session.testAgent.get('/v1/human/contacts').query({ limit: 1, after: first.body.next });
      expect(second.status).to.equal(200);
      expect(second.body.data).to.have.length(1);
      expect(second.body.data[0].subscriberId).to.not.equal(first.body.data[0].subscriberId);
    });

    it('returns an empty page for a malformed cursor', async () => {
      const res = await session.testAgent.get('/v1/human/contacts').query({ after: 'not-a-cursor' });
      expect(res.status).to.equal(200);
      expect(res.body.data).to.deep.equal([]);
      expect(res.body.next).to.equal(null);
    });
  });
});
