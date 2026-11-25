import { ExecutionContext } from '@nestjs/common';
import { PinoLogger, Store, storage } from '@novu/application-generic';
import { expect } from 'chai';
import { of } from 'rxjs';
import sinon from 'sinon';
import { TelemetryContextInterceptor } from './telemetry-context.interceptor';

const newrelic = require('newrelic');

describe('TelemetryContextInterceptor', () => {
  let logger: PinoLogger;
  let interceptor: TelemetryContextInterceptor;
  let nextHandle: sinon.SinonStub;
  let addCustomAttributes: sinon.SinonStub;

  beforeEach(() => {
    logger = new PinoLogger({ pinoHttp: { level: 'silent' } });
    interceptor = new TelemetryContextInterceptor(logger);
    nextHandle = sinon.stub().returns(of({ ok: true }));
    addCustomAttributes = sinon.stub(newrelic, 'addCustomAttributes');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('adds the organization and environment to the request logger and the New Relic transaction', () => {
    const store = new Store(logger.logger.child({}));

    storage.run(store, () =>
      interceptor.intercept(createContext({ organizationId: 'org_1', environmentId: 'env_1' }), { handle: nextHandle })
    );

    expect(store.logger.bindings()).to.include({ organizationId: 'org_1', environmentId: 'env_1' });
    expect(addCustomAttributes.calledOnceWith({ organizationId: 'org_1', environmentId: 'env_1' })).to.equal(true);
    expect(nextHandle.calledOnce).to.equal(true);
  });

  it('adds only the organization to the request logger when the session has no environment', () => {
    const store = new Store(logger.logger.child({}));

    storage.run(store, () =>
      interceptor.intercept(createContext({ organizationId: 'org_1', environmentId: '' }), { handle: nextHandle })
    );

    expect(store.logger.bindings()).to.include({ organizationId: 'org_1' });
    expect(store.logger.bindings()).not.to.have.property('environmentId');
  });

  it('leaves the request logger and the New Relic transaction unchanged without a session', () => {
    const requestLogger = logger.logger.child({});
    const store = new Store(requestLogger);

    storage.run(store, () => interceptor.intercept(createContext(undefined), { handle: nextHandle }));

    expect(store.logger).to.equal(requestLogger);
    expect(addCustomAttributes.called).to.equal(false);
    expect(nextHandle.calledOnce).to.equal(true);
  });

  it('still tags the New Relic transaction outside the request logging scope', () => {
    expect(() =>
      interceptor.intercept(createContext({ organizationId: 'org_1', environmentId: 'env_1' }), { handle: nextHandle })
    ).not.to.throw();
    expect(addCustomAttributes.calledOnce).to.equal(true);
    expect(nextHandle.calledOnce).to.equal(true);
  });
});

function createContext(user: { organizationId: string; environmentId: string } | undefined): ExecutionContext {
  return {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}
