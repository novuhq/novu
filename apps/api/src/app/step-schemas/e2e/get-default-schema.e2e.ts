import { expect } from 'chai';

import { UserSession } from '@novu/testing';
import { StepTypeEnum } from '@novu/shared';

describe('Get Control Schema - /controls/:stepType/schema (GET)', async () => {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should get control schema for email step', async function () {
    const { body } = await session.testAgent.get(`/v1/controls/${StepTypeEnum.EMAIL}/schema`);

    expect(body.data.type).to.equal('object');
    expect(body.data.properties).to.have.property('subject');
    expect(body.data.properties).to.have.property('body');
    expect(body.data.required).to.deep.equal(['subject', 'body']);
    expect(body.data.additionalProperties).to.be.false;
  });

  it('should get control schema for sms step', async function () {
    const { body } = await session.testAgent.get(`/v1/controls/${StepTypeEnum.SMS}/schema`);

    expect(body.data.type).to.equal('object');
    expect(body.data.properties).to.have.property('body');
    expect(body.data.required).to.deep.equal(['body']);
    expect(body.data.additionalProperties).to.be.false;
  });

  it('should get control schema for push step', async function () {
    const { body } = await session.testAgent.get(`/v1/controls/${StepTypeEnum.PUSH}/schema`);

    expect(body.data.type).to.equal('object');
    expect(body.data.properties).to.have.property('subject');
    expect(body.data.properties).to.have.property('body');
    expect(body.data.required).to.deep.equal(['subject', 'body']);
    expect(body.data.additionalProperties).to.be.false;
  });

  it('should get control schema for in-app step', async function () {
    const { body } = await session.testAgent.get(`/v1/controls/${StepTypeEnum.IN_APP}/schema`);

    expect(body.data.type).to.equal('object');
    expect(body.data.properties).to.have.property('subject');
    expect(body.data.properties).to.have.property('body');
    expect(body.data.properties).to.have.property('avatar');
    expect(body.data.properties).to.have.property('primaryAction');
    expect(body.data.properties).to.have.property('secondaryAction');
    expect(body.data.properties).to.have.property('data');
    expect(body.data.properties).to.have.property('redirect');
    expect(body.data.required).to.deep.equal(['body']);
    expect(body.data.additionalProperties).to.be.false;
  });

  it('should get control schema for chat step', async function () {
    const { body } = await session.testAgent.get(`/v1/controls/${StepTypeEnum.CHAT}/schema`);

    expect(body.data.type).to.equal('object');
    expect(body.data.properties).to.have.property('body');
    expect(body.data.required).to.deep.equal(['body']);
    expect(body.data.additionalProperties).to.be.false;
  });

  it('should get control schema for delay step', async function () {
    const { body } = await session.testAgent.get(`/v1/controls/${StepTypeEnum.DELAY}/schema`);

    expect(body.data.type).to.equal('object');
    expect(body.data.properties).to.have.property('type');
    expect(body.data.properties).to.have.property('amount');
    expect(body.data.properties).to.have.property('unit');
    expect(body.data.required).to.deep.equal(['amount', 'unit']);
    expect(body.data.additionalProperties).to.be.false;
  });

  it('should get control schema for digest step', async function () {
    const { body } = await session.testAgent.get(`/v1/controls/${StepTypeEnum.DIGEST}/schema`);

    expect(body.data).to.have.property('oneOf');
    expect(body.data.oneOf).to.be.an('array').with.lengthOf(2);
    expect(body.data.oneOf[0].type).to.equal('object');
    expect(body.data.oneOf[1].type).to.equal('object');
  });

  it('should return empty object for custom step', async function () {
    const { body } = await session.testAgent.get(`/v1/controls/${StepTypeEnum.CUSTOM}/schema`);

    expect(body.data).to.deep.equal({});
  });

  it('should return 400 for invalid step type', async function () {
    const res = await session.testAgent.get('/v1/controls/invalid-step-type/schema');

    expect(res.body.message).to.be.an('array');
    expect(res.body.message[0]).to.include('stepType must be one of the following values');
    expect(res.body.error).to.equal('Bad Request');
    expect(res.body.statusCode).to.equal(400);
  });
});
