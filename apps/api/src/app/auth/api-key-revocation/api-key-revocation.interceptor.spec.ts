import { CallHandler, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiAuthSchemeEnum } from '@novu/shared';
import { expect } from 'chai';
import newrelic from 'newrelic';
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
  let addCustomAttributes: sinon.SinonStub;

  beforeEach(() => {
    addCustomAttributes = sinon.stub(newrelic, 'addCustomAttributes');
    service = { assertRequestAllowed: sinon.stub().resolves() };
    next = { handle: sinon.stub().returns(of('handled')) };
    interceptor = new ApiKeyRevocationInterceptor(service as never);
  });

  afterEach(() => {
    addCustomAttributes.restore();
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

  it('records the address Cloudflare saw the call come from, not one the caller sent', async () => {
    const headers = {
      ...apiKeyRequest.headers,
      'cf-connecting-ip': '203.0.113.7',
      'cf-ipcountry': 'NL',
      'x-client-ip': '198.51.100.1',
      'x-forwarded-for': '198.51.100.2, 203.0.113.7',
    };

    await interceptor.intercept(contextFor({ ...apiKeyRequest, headers }), next);

    expect(addCustomAttributes.calledOnce).to.equal(true);
    expect(addCustomAttributes.firstCall.args[0]).to.deep.equal({
      authScheme: 'ApiKey',
      clientIp: '203.0.113.7',
      clientCountry: 'NL',
    });
  });

  it('reads the forwarded address where Cloudflare is not in front of the API', async () => {
    const headers = { ...apiKeyRequest.headers, 'x-forwarded-for': '198.51.100.2, 10.0.0.1' };

    await interceptor.intercept(contextFor({ ...apiKeyRequest, headers }), next);

    expect(addCustomAttributes.firstCall.args[0]).to.deep.equal({ authScheme: 'ApiKey', clientIp: '198.51.100.2' });
  });

  it('records the call before the key is checked, so a rejected call keeps its address', async () => {
    service.assertRequestAllowed.callsFake(async () => {
      expect(addCustomAttributes.calledOnce).to.equal(true);
    });

    await interceptor.intercept(contextFor(apiKeyRequest), next);

    expect(service.assertRequestAllowed.calledOnce).to.equal(true);
    expect(addCustomAttributes.firstCall.args[0]).to.deep.equal({ authScheme: 'ApiKey' });
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
    expect(addCustomAttributes.called).to.equal(false);
    expect(next.handle.callCount).to.equal(3);
  });
});
