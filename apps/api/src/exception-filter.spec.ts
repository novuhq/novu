import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import { expect } from 'chai';
import sinon from 'sinon';
import { AllExceptionsFilter } from './exception-filter';

function buildLogRequest(overrides: Record<string, unknown> = {}) {
  return {
    url: '/v1/test',
    originalUrl: '/v1/test',
    path: '/v1/test',
    hostname: 'localhost',
    method: 'GET',
    headers: { 'user-agent': 'mocha' },
    route: { path: '/v1/test' },
    body: {},
    _nvRequestId: 'req_123',
    _shouldLogAnalytics: true,
    user: {
      _id: 'u1',
      organizationId: 'o1',
      environmentId: 'e1',
      scheme: 'Bearer',
    },
    ...overrides,
  };
}

type LoggerStub = {
  error: sinon.SinonStub;
  warn: sinon.SinonStub;
};

type RequestLogRepositoryStub = {
  create: sinon.SinonStub;
};

function buildHost({
  request,
  response,
}: {
  request: Record<string, unknown>;
  response: { status: sinon.SinonStub; json: sinon.SinonStub };
}): ArgumentsHost {
  const httpHost = {
    getRequest: () => request,
    getResponse: () => response,
    getNext: () => undefined,
  };

  return {
    switchToHttp: () => httpHost,
  } as unknown as ArgumentsHost;
}

describe('AllExceptionsFilter', () => {
  let logger: LoggerStub;
  let requestLogRepository: RequestLogRepositoryStub;
  let filter: AllExceptionsFilter;
  let unhandledRejections: unknown[];
  let unhandledRejectionListener: (reason: unknown) => void;

  beforeEach(() => {
    logger = {
      error: sinon.stub(),
      warn: sinon.stub(),
    };
    requestLogRepository = {
      create: sinon.stub(),
    };
    filter = new AllExceptionsFilter(logger as never, requestLogRepository as never);

    unhandledRejections = [];
    unhandledRejectionListener = (reason: unknown) => {
      unhandledRejections.push(reason);
    };
    process.on('unhandledRejection', unhandledRejectionListener);
  });

  afterEach(() => {
    process.removeListener('unhandledRejection', unhandledRejectionListener);
    sinon.restore();
  });

  it('should send the error response without awaiting the analytics log write', async () => {
    requestLogRepository.create.returns(new Promise(() => {}));

    const status = sinon.stub().returnsThis();
    const json = sinon.stub().returnsThis();
    const response = { status, json };
    const request = buildLogRequest();
    process.env.IS_ANALYTICS_LOGS_ENABLED = 'true';

    const host = buildHost({ request, response });
    const exception = new BadRequestException('boom');

    await filter.catch(exception, host);

    expect(status.calledWith(HttpStatus.BAD_REQUEST)).to.equal(true);
    expect(json.calledOnce).to.equal(true);
    expect(requestLogRepository.create.calledOnce).to.equal(true);
  });

  it('should catch a rejected ClickHouse write and log a warning instead of producing an unhandled rejection', async () => {
    const failure = new Error('clickhouse unavailable');
    requestLogRepository.create.rejects(failure);

    const status = sinon.stub().returnsThis();
    const json = sinon.stub().returnsThis();
    const response = { status, json };
    const request = buildLogRequest();
    process.env.IS_ANALYTICS_LOGS_ENABLED = 'true';

    const host = buildHost({ request, response });
    const exception = new BadRequestException('boom');

    await filter.catch(exception, host);

    // Allow the floating .catch handler to run.
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    expect(status.calledWith(HttpStatus.BAD_REQUEST)).to.equal(true);
    expect(json.calledOnce).to.equal(true);
    expect(requestLogRepository.create.calledOnce).to.equal(true);
    expect(logger.warn.calledOnce).to.equal(true);
    const [logContext, logMessage] = logger.warn.firstCall.args;
    expect(logContext).to.deep.equal({ err: failure });
    expect(logMessage).to.equal('Failed to log analytics to ClickHouse after retries');
    expect(unhandledRejections).to.deep.equal([]);
  });

  it('should not call the request log repository when analytics logging is not enabled', async () => {
    const status = sinon.stub().returnsThis();
    const json = sinon.stub().returnsThis();
    const response = { status, json };
    const request = buildLogRequest({ _shouldLogAnalytics: false });
    process.env.IS_ANALYTICS_LOGS_ENABLED = 'true';

    const host = buildHost({ request, response });

    await filter.catch(new BadRequestException('boom'), host);

    expect(requestLogRepository.create.called).to.equal(false);
  });
});
