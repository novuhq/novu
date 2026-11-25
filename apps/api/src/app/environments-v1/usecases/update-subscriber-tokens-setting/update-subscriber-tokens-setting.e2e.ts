import { EnvironmentRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { Types } from 'mongoose';

describe('Require signed subscriber tokens - PUT /v1/environments/:environmentId/subscriber-tokens #novu-v2', () => {
  let session: UserSession;
  let previousFlag: string | undefined;
  const environmentRepository = new EnvironmentRepository();

  function setFlag(enabled: boolean) {
    process.env.IS_SUBSCRIBER_TOKENS_ENABLED = enabled ? 'true' : 'false';
  }

  function setRequired(required: boolean, environmentId = session.environment._id, owner = session) {
    return owner.testAgent.put(`/v1/environments/${environmentId}/subscriber-tokens`).send({ required });
  }

  function findStored(environmentId = session.environment._id) {
    return environmentRepository._model.collection.findOne({ _id: new Types.ObjectId(environmentId) });
  }

  function getRequirement() {
    return session.testAgent
      .get('/v1/internal/subscriber-tokens-requirement')
      .set('Authorization', `Bearer ${session.subscriberToken}`)
      .expect(200);
  }

  before(() => {
    previousFlag = process.env.IS_SUBSCRIBER_TOKENS_ENABLED;
  });

  beforeEach(async () => {
    setFlag(true);
    session = new UserSession();
    await session.initialize();
  });

  after(() => {
    if (previousFlag === undefined) {
      delete process.env.IS_SUBSCRIBER_TOKENS_ENABLED;
    } else {
      process.env.IS_SUBSCRIBER_TOKENS_ENABLED = previousFlag;
    }
  });

  it('should store requiredAt when turned on and keep the first requiredAt on a second turn-on', async () => {
    const first = await setRequired(true).expect(200);
    const stored = await findStored();

    expect(first.body.data.required).to.equal(true);
    expect(stored?.subscriberTokens?.requiredAt).to.be.instanceOf(Date);
    expect(new Date(first.body.data.requiredAt).getTime()).to.equal(stored?.subscriberTokens?.requiredAt.getTime());

    const second = await setRequired(true).expect(200);
    const storedAfterSecond = await findStored();

    expect(second.body.data.requiredAt).to.equal(first.body.data.requiredAt);
    expect(storedAfterSecond?.subscriberTokens?.requiredAt.getTime()).to.equal(
      stored?.subscriberTokens?.requiredAt.getTime()
    );
  });

  it('should return the setting on the current environment', async () => {
    const { body: updated } = await setRequired(true).expect(200);
    const { body } = await session.testAgent.get('/v1/environments/me').expect(200);

    expect(body.data.subscriberTokens.requiredAt).to.equal(updated.data.requiredAt);
  });

  it('should remove the setting from the document when turned off', async () => {
    await setRequired(true).expect(200);

    const { body } = await setRequired(false).expect(200);
    const stored = await findStored();
    const { body: current } = await session.testAgent.get('/v1/environments/me').expect(200);

    expect(body.data).to.deep.equal({ required: false });
    expect(stored).to.exist;
    expect(stored).to.not.have.property('subscriberTokens');
    expect(current.data).to.not.have.property('subscriberTokens');
  });

  it('should refuse with subscriber_tokens_disabled and store nothing when the flag is off', async () => {
    setFlag(false);

    const { body } = await setRequired(true).expect(403);
    const stored = await findStored();

    expect(body.error).to.equal('subscriber_tokens_disabled');
    expect(stored).to.not.have.property('subscriberTokens');
  });

  it("should not change another organization's environment", async () => {
    const otherSession = new UserSession();
    await otherSession.initialize();

    const { status } = await setRequired(true, otherSession.environment._id);
    const stored = await findStored(otherSession.environment._id);

    expect(status).to.be.oneOf([401, 404]);
    expect(stored).to.not.have.property('subscriberTokens');
  });

  describe('GET /v1/internal/subscriber-tokens-requirement', () => {
    it('should follow the stored setting', async () => {
      expect((await getRequirement()).body.data).to.deep.equal({ required: false });

      await setRequired(true).expect(200);
      expect((await getRequirement()).body.data).to.deep.equal({ required: true });

      await setRequired(false).expect(200);
      expect((await getRequirement()).body.data).to.deep.equal({ required: false });
    });

    it('should not require tokens when the flag is off, even with the setting stored', async () => {
      await environmentRepository.update(
        { _id: session.environment._id, _organizationId: session.organization._id },
        { $set: { 'subscriberTokens.requiredAt': new Date() } }
      );
      setFlag(false);

      expect((await getRequirement()).body.data).to.deep.equal({ required: false });
    });

    it('should reject a request without a subscriber token', async () => {
      await session.testAgent.get('/v1/internal/subscriber-tokens-requirement').expect(401);
    });
  });
});
