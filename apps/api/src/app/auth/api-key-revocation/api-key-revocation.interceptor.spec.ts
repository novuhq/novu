import { CallHandler, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiAuthSchemeEnum } from '@novu/shared';
import { expect } from 'chai';
import { lastValueFrom, of } from 'rxjs';
import sinon from 'sinon';
import { ApiKeyRevocationInterceptor } from './api-key-revocation.interceptor';

function contextFor(request: Record<string, unknown>, type = 'http'): ExecutionContext {
  return {
    getType: () => type,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const apiKeyRequest = {
  user: { scheme: ApiAuthSchemeEnum.API_KEY, organizationId: 'org-id', environmentId: 'env-id' },
  headers: { authorization: 'ApiKey secret-value' },
  method: 'DELETE',
  path: '/v1/events/trigger/transaction-1',
  route: { path: '/v1/events/trigger/:transactionId' },
};

describe('ApiKeyRevocationInterceptor', () => {
  let service: { assertRequestAllowed: sinon.SinonStub };
  let next: CallHandler & { handle: sinon.SinonStub };
  let interceptor: ApiKeyRevocationInterceptor;

  beforeEach(() => {
    service = { assertRequestAllowed: sinon.stub().resolves() };
    next = { handle: sinon.stub().returns(of('handled')) };
    interceptor = new ApiKeyRevocationInterceptor(service as never);
  });

  it('checks a call made with an API key against the matched route pattern', async () => {
    const result = await interceptor.intercept(contextFor(apiKeyRequest), next);

    expect(await lastValueFrom(result)).to.equal('handled');
    expect(service.assertRequestAllowed.firstCall.args[0]).to.deep.equal({
      organizationId: 'org-id',
      environmentId: 'env-id',
      authorization: 'ApiKey secret-value',
      method: 'DELETE',
      routePath: '/v1/events/trigger/:transactionId',
    });
  });

  it('uses the request path when no route matched', async () => {
    await interceptor.intercept(contextFor({ ...apiKeyRequest, route: undefined }), next);

    expect(service.assertRequestAllowed.firstCall.args[0].routePath).to.equal('/v1/events/trigger/transaction-1');
  });

  it('does not run the handler when the key is revoked', async () => {
    service.assertRequestAllowed.rejects(new UnauthorizedException('revoked'));

    let error: unknown;

    try {
      await interceptor.intercept(contextFor(apiKeyRequest), next);
    } catch (caught) {
      error = caught;
    }

    expect(error).to.be.instanceOf(UnauthorizedException);
    expect(next.handle.called).to.equal(false);
  });

  it('leaves dashboard sessions, unauthenticated calls and non-HTTP contexts alone', async () => {
    await interceptor.intercept(
      contextFor({ ...apiKeyRequest, user: { ...apiKeyRequest.user, scheme: ApiAuthSchemeEnum.BEARER } }),
      next
    );
    await interceptor.intercept(contextFor({ ...apiKeyRequest, user: undefined }), next);
    await interceptor.intercept(contextFor(apiKeyRequest, 'rpc'), next);

    expect(service.assertRequestAllowed.called).to.equal(false);
    expect(next.handle.callCount).to.equal(3);
  });
});
