import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Preview email - /v1/content-templates/preview/email (POST)', function () {
  let session: UserSession;
  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should generate preview html email', async function () {
    const {
      body: {
        data: { html },
      },
    } = await session.testAgent.post(`/v1/content-templates/preview/email`).send({
      contentType: 'editor',
      content: [{ type: 'text', content: 'test {{test}} test' }],
    });

    expect(html.includes('test {{test}} test')).true;
  });
});
