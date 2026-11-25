import { PinoLogger, storage } from '@novu/application-generic';
import { expect } from 'chai';
import sinon from 'sinon';
import { runInJobTelemetryContext } from './job-telemetry-context';

const newrelic = require('newrelic');

type Line = Record<string, unknown>;

const CONTEXT = { organizationId: 'org-id', environmentId: 'env-id', transactionId: 'transaction-id' };

/** Stands in for pino: a child keeps its parent's bindings, and each line records the bindings it was written with. */
function recordingLogger(lines: Line[], bindings: Line = {}) {
  return {
    child: (more: Line) => recordingLogger(lines, { ...bindings, ...more }),
    info: (msg: string) => lines.push({ ...bindings, msg }),
  };
}

/** What a usecase's `PinoLogger` writes to: the logger of the current job's scope. */
function writeLine(msg: string) {
  storage.getStore()?.logger.info(msg);
}

describe('runInJobTelemetryContext', () => {
  // nestjs-pino sets the root logger when the HTTP app starts, which no unit spec does.
  const rootLoggerHolder = PinoLogger as unknown as { root: unknown };
  const originalRootLogger = rootLoggerHolder.root;
  let lines: Line[];
  let addCustomAttributes: sinon.SinonStub;

  beforeEach(() => {
    lines = [];
    rootLoggerHolder.root = recordingLogger(lines);
    addCustomAttributes = sinon.stub(newrelic, 'addCustomAttributes');
  });

  afterEach(() => {
    sinon.restore();
    rootLoggerHolder.root = originalRootLogger;
  });

  it('binds the ids to every line the job writes', () => {
    runInJobTelemetryContext(CONTEXT, () => writeLine('job started'));

    expect(lines).to.deep.equal([{ ...CONTEXT, msg: 'job started' }]);
  });

  it('keeps the ids when a usecase assigns its own fields', () => {
    runInJobTelemetryContext({ organizationId: 'org-id', environmentId: 'env-id' }, () => {
      new PinoLogger({}).assign({ transactionId: 'transaction-id', jobId: 'job-id' });
      writeLine('job claimed');
    });

    expect(lines).to.deep.equal([{ ...CONTEXT, jobId: 'job-id', msg: 'job claimed' }]);
  });

  it('adds the ids to the New Relic transaction', () => {
    runInJobTelemetryContext(CONTEXT, () => undefined);

    expect(addCustomAttributes.calledOnceWithExactly(CONTEXT)).to.equal(true);
  });

  it('returns what the job returns and leaves no scope behind', () => {
    expect(runInJobTelemetryContext(CONTEXT, () => 'done')).to.equal('done');
    expect(storage.getStore()).to.equal(undefined);
  });

  it('runs the job without a root logger', () => {
    rootLoggerHolder.root = undefined;

    expect(runInJobTelemetryContext(CONTEXT, () => 'done')).to.equal('done');
  });
});
