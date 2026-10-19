import { expect } from 'chai';
import ContextDev from 'context.dev';
import { restore, stub } from 'sinon';

import { BrandRetrievalService } from './brand-retrieval.service';

describe('BrandRetrievalService', () => {
  let service: BrandRetrievalService;
  let loggerMock: {
    setContext: sinon.SinonStub;
    info: sinon.SinonStub;
    warn: sinon.SinonStub;
  };
  let retrieveStub: sinon.SinonStub;

  beforeEach(() => {
    loggerMock = {
      setContext: stub(),
      info: stub(),
      warn: stub(),
    };

    retrieveStub = stub();
    service = new BrandRetrievalService(loggerMock as any);
    // Wire a fake client directly since `initialize()` is gated on an env var
    // and the live SDK's retrieve behaviour is what we want to exercise here.
    (service as any).client = { brand: { retrieve: retrieveStub } };
  });

  afterEach(() => restore());

  it('returns an empty result when context.dev responds with "Domain branding not present"', async () => {
    const apiError = Object.create(ContextDev.APIError.prototype);
    apiError.status = 400;
    apiError.message = '400 Domain branding not present [example.com]';
    retrieveStub.rejects(apiError);

    const result = await service.retrieveBrand('example.com');

    expect(result).to.deep.equal({});
    expect(loggerMock.info.calledOnce).to.equal(true);
  });

  it('returns an empty result when context.dev responds with DNS-resolution variant', async () => {
    const apiError = Object.create(ContextDev.APIError.prototype);
    apiError.status = 400;
    apiError.message = '400 Domain branding not present (DNS resolution failed) [example.com]';
    retrieveStub.rejects(apiError);

    const result = await service.retrieveBrand('example.com');

    expect(result).to.deep.equal({});
  });

  it('rethrows unrelated APIError responses (e.g. auth)', async () => {
    const apiError = Object.create(ContextDev.APIError.prototype);
    apiError.status = 401;
    apiError.message = '401 Unauthorized';
    retrieveStub.rejects(apiError);

    let caught: unknown;
    try {
      await service.retrieveBrand('example.com');
    } catch (error) {
      caught = error;
    }

    expect(caught).to.equal(apiError);
  });

  it('rethrows non-APIError errors (e.g. network)', async () => {
    const networkError = new Error('Network down');
    retrieveStub.rejects(networkError);

    let caught: unknown;
    try {
      await service.retrieveBrand('example.com');
    } catch (error) {
      caught = error;
    }

    expect(caught).to.equal(networkError);
  });

  it('returns the brand when the provider has a record', async () => {
    retrieveStub.resolves({
      brand: {
        title: 'Acme',
        description: 'Acme Inc.',
        industries: {
          eic: [{ industry: 'Software', subindustry: 'SaaS' }],
        },
        logos: [],
        colors: [],
      },
    });

    const result = await service.retrieveBrand('acme.example');

    expect(result.companyTitle).to.equal('Acme');
    expect(result.companyDescription).to.equal('Acme Inc.');
    expect(result.industry).to.deep.equal([{ industry: 'Software', subindustry: 'SaaS' }]);
  });
});
