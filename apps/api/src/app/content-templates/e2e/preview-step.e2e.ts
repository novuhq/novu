import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Preview sms - /v1/content-templates/preview/sms (POST)', function () {
  let session: UserSession;
  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should generate preview sms content', async function () {
    const {
      body: {
        data: { content },
      },
    } = await session.testAgent.post(`/v1/content-templates/preview/sms`).send({
      content: 'Hello {{test}}',
      payload: { test: 'sms payload' },
      subject: 'test {{test}} test',
    });

    expect(content.includes('Hello sms payload')).true;
  });
});

describe('Preview chat - /v1/content-templates/preview/chat (POST)', function () {
  let session: UserSession;
  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should generate preview chat content', async function () {
    const {
      body: {
        data: { content },
      },
    } = await session.testAgent.post(`/v1/content-templates/preview/chat`).send({
      content: 'Hello {{test}}',
      payload: { test: 'chat payload' },
      subject: 'test {{test}} test',
    });

    expect(content.includes('Hello chat payload')).true;
  });
});

describe('Preview push - /v1/content-templates/preview/push (POST)', function () {
  let session: UserSession;
  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should generate preview push content', async function () {
    const {
      body: {
        data: { content },
      },
    } = await session.testAgent.post(`/v1/content-templates/preview/push`).send({
      content: 'Hello {{test}}',
      payload: { test: 'push payload' },
      subject: 'test {{test}} test',
    });

    expect(content.includes('Hello push payload')).true;
  });
});
