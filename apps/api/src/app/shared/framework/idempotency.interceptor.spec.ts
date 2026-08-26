import { ExecutionContext, HttpException, HttpStatus, UnprocessableEntityException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CacheService, FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { ApiAuthSchemeEnum } from '@novu/shared';
import { expect } from 'chai';
import { createHash } from 'crypto';
import { lastValueFrom, of } from 'rxjs';
import sinon from 'sinon';
import { serializeCachedHttpError } from './idempotency-http-error';
import { IdempotencyInterceptor } from './idempotency.interceptor';

describe('IdempotencyInterceptor', () => {
  const body = { name: 'missing-workflow' };
  const bodyHash = createHash('blake2s256')
    .update(Buffer.from(JSON.stringify(body)))
    .digest('hex');
  let cacheService: sinon.SinonStubbedInstance<CacheService>;
  let featureFlagsService: sinon.SinonStubbedInstance<FeatureFlagsService>;
  let interceptor: IdempotencyInterceptor;
  let nextHandle: sinon.SinonStub;
  let logger: { setContext: sinon.SinonStub; warn: sinon.SinonStub; error: sinon.SinonStub; trace: sinon.SinonStub };

  beforeEach(() => {
    cacheService = sinon.createStubInstance(CacheService);
    featureFlagsService = sinon.createStubInstance(FeatureFlagsService);
    featureFlagsService.getFlag.resolves(true);
    logger = {
      setContext: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      trace: sinon.stub(),
    };

    interceptor = new IdempotencyInterceptor(
      { getAllAndOverride: sinon.stub().returns(false) } as unknown as Reflector,
      cacheService as unknown as CacheService,
      featureFlagsService as unknown as FeatureFlagsService,
      logger as unknown as PinoLogger
    );

    nextHandle = sinon.stub().returns(of({ ok: true }));
  });

  afterEach(() => {
    sinon.restore();
  });

  it('replays a cached workflow_not_found error as 422 instead of 503', async () => {
    cacheService.setIfNotExist.resolves(null);
    cacheService.get.resolves(
      JSON.stringify({
        status: 'error',
        bodyHash,
        data: serializeCachedHttpError(new UnprocessableEntityException('workflow_not_found')),
      })
    );

    try {
      await lastValueFrom(await interceptor.intercept(createContext(body), { handle: nextHandle }));
      expect.fail('Expected HttpException');
    } catch (err) {
      expect(err).to.be.instanceOf(HttpException);
      expect((err as HttpException).getStatus()).to.equal(HttpStatus.UNPROCESSABLE_ENTITY);
      expect((err as HttpException).message).to.equal('workflow_not_found');
      expect(nextHandle.called).to.equal(false);
    }
  });

  it('replays a legacy JSON.stringified HttpException as 422 instead of 503', async () => {
    cacheService.setIfNotExist.resolves(null);
    cacheService.get.resolves(
      JSON.stringify({
        status: 'error',
        bodyHash,
        data: JSON.parse(JSON.stringify(new UnprocessableEntityException('workflow_not_found'))),
      })
    );

    try {
      await lastValueFrom(await interceptor.intercept(createContext(body), { handle: nextHandle }));
      expect.fail('Expected HttpException');
    } catch (err) {
      expect(err).to.be.instanceOf(HttpException);
      expect((err as HttpException).getStatus()).to.equal(HttpStatus.UNPROCESSABLE_ENTITY);
      expect((err as HttpException).message).to.equal('workflow_not_found');
    }
  });

  it('returns 409 when the idempotency cache entry is missing', async () => {
    cacheService.setIfNotExist.resolves(null);
    cacheService.get.resolves(undefined as unknown as string);

    try {
      await lastValueFrom(await interceptor.intercept(createContext(body), { handle: nextHandle }));
      expect.fail('Expected HttpException');
    } catch (err) {
      expect(err).to.be.instanceOf(HttpException);
      expect((err as HttpException).getStatus()).to.equal(HttpStatus.CONFLICT);
      expect(nextHandle.called).to.equal(false);
    }
  });
});

function createContext(body: object): ExecutionContext {
  const request = {
    method: 'POST',
    headers: { 'idempotency-key': 'ea398302-4865-4851-a9a9-25da599c923d' },
    body,
    user: { _id: 'user-id', organizationId: 'org-id', environmentId: 'env-id' },
    authScheme: ApiAuthSchemeEnum.API_KEY,
  };
  const response = { set: sinon.stub() };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}
