import { expect } from 'chai';
import sinon from 'sinon';
import { TestHttpEndpointCommand } from './test-http-endpoint.command';
import { TestHttpEndpointUsecase } from './test-http-endpoint.usecase';

describe('TestHttpEndpointUsecase SSRF', () => {
  const previous = {
    NOVU_ENTERPRISE: process.env.NOVU_ENTERPRISE,
    IS_SELF_HOSTED: process.env.IS_SELF_HOSTED,
    CI_EE_TEST: process.env.CI_EE_TEST,
  };

  beforeEach(() => {
    delete process.env.NOVU_ENTERPRISE;
    delete process.env.CI_EE_TEST;
    process.env.IS_SELF_HOSTED = 'true';
  });

  afterEach(() => {
    sinon.restore();

    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  function buildUsecase() {
    const httpClientService = {
      request: sinon.stub().resolves({
        statusCode: 200,
        body: 'ok',
        headers: {},
      }),
    };
    const getDecryptedSecretKey = {
      execute: sinon.stub().resolves('secret-key'),
    };
    const usecase = new TestHttpEndpointUsecase(httpClientService as never, getDecryptedSecretKey as never);

    return { usecase, httpClientService };
  }

  it('pins DNS for internal hostnames on self-hosted deployments', async () => {
    const { usecase, httpClientService } = buildUsecase();

    const result = await usecase.execute(
      TestHttpEndpointCommand.create({
        user: { environmentId: 'env_1' } as never,
        controlValues: {
          url: 'http://mongodb:27017',
          method: 'GET',
        },
      })
    );

    expect(result.statusCode).to.equal(200);
    expect(httpClientService.request.calledOnce).to.equal(true);
    expect(httpClientService.request.firstCall.args[0].enforceSsrfProtection).to.equal(true);
    expect(httpClientService.request.firstCall.args[0].url).to.equal('http://mongodb:27017');
  });

  it('rejects cloud metadata IP literals before connecting on self-hosted deployments', async () => {
    const { usecase, httpClientService } = buildUsecase();

    const result = await usecase.execute(
      TestHttpEndpointCommand.create({
        user: { environmentId: 'env_1' } as never,
        controlValues: {
          url: 'http://169.254.169.254/latest/meta-data/',
          method: 'GET',
        },
      })
    );

    expect(result.statusCode).to.equal(400);
    expect(httpClientService.request.called).to.equal(false);
    expect(result.body).to.deep.include({
      error: 'Requests to private or reserved IP addresses are not allowed (resolved: 169.254.169.254).',
    });
  });
});
