import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Test HTTP Request Endpoint - /v2/workflows/steps/test-http-request (POST) #novu-v2', () => {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should resolve canonical raw JSON string body controls', async () => {
    const response = await session.testAgent.post('/v2/workflows/steps/test-http-request').send({
      controlValues: {
        url: `http://localhost:${process.env.PORT}/v1/health-check`,
        method: 'POST',
        headers: [{ key: 'content-type', value: 'application/json' }],
        body: JSON.stringify({
          name: '{{payload.name}}',
          nested: {
            source: 'canonical',
          },
        }),
      },
      previewPayload: {
        payload: {
          name: 'Ada',
        },
      },
    });

    expect(response.status).to.equal(201);
    expect(response.body.data.resolvedRequest.body).to.deep.equal({
      name: 'Ada',
      nested: {
        source: 'canonical',
      },
    });
    expect(response.body.data.resolvedRequest.headers).to.have.property('novu-signature');
  });

  it('should resolve legacy key-value array body controls', async () => {
    const response = await session.testAgent.post('/v2/workflows/steps/test-http-request').send({
      controlValues: {
        url: `http://localhost:${process.env.PORT}/v1/health-check`,
        method: 'POST',
        headers: [{ key: 'content-type', value: 'application/json' }],
        body: [
          { key: 'name', value: '{{payload.name}}' },
          { key: 'source', value: 'legacy' },
        ],
      },
      previewPayload: {
        payload: {
          name: 'Ada',
        },
      },
    });

    expect(response.status).to.equal(201);
    expect(response.body.data.resolvedRequest.body).to.deep.equal({
      name: 'Ada',
      source: 'legacy',
    });
    expect(response.body.data.resolvedRequest.headers).to.have.property('novu-signature');
  });
});
