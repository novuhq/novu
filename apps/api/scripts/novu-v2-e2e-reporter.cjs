/**
 * Mocha reporter for the Novu V2 E2E shards. It prints through an inner reporter (`dot` in CI, `spec` locally), so
 * the console output does not change, and records each test's time, attempts and result.
 *
 * Reporter options (`--reporter-option key=value`):
 *   inner  - the reporter that prints to the console. Default: spec.
 *   output - where to write the raw results as JSON when the run ends. No file when not set.
 *
 * Paths in the results are absolute; novu-v2-e2e-report.cjs makes them relative and adds the shard metadata.
 */

const fs = require('node:fs');
const path = require('node:path');
const Mocha = require('mocha');

const {
  EVENT_RUN_BEGIN,
  EVENT_RUN_END,
  EVENT_SUITE_BEGIN,
  EVENT_SUITE_END,
  EVENT_TEST_RETRY,
  EVENT_TEST_END,
  EVENT_TEST_FAIL,
} = Mocha.Runner.constants;

const MAX_ERROR_LENGTH = 300;

function firstLine(error) {
  const message = error && typeof error.message === 'string' ? error.message : String(error);
  const line = message.split('\n').find((part) => part.trim().length > 0) || '';

  return line.trim().slice(0, MAX_ERROR_LENGTH);
}

function loadInnerReporter(name) {
  if (Mocha.reporters[name]) {
    return Mocha.reporters[name];
  }

  return require(require.resolve(name, { paths: [process.cwd()] }));
}

function isFileSuite(suite) {
  return Boolean(suite.parent?.root && suite.file);
}

function testKey(test) {
  return `${test.file}\u0000${test.fullTitle()}`;
}

class NovuV2E2eReporter {
  constructor(runner, options) {
    const reporterOptions = options.reporterOption || options.reporterOptions || {};
    const Inner = loadInnerReporter(reporterOptions.inner || 'spec');

    this.inner = new Inner(runner, options);
    this.output = reporterOptions.output;
    this.startedAt = null;
    this.fileDurations = new Map();
    this.suiteStarts = new Map();
    this.retriedErrors = new Map();
    this.tests = [];
    this.hookFailures = [];

    runner.on(EVENT_RUN_BEGIN, () => {
      this.startedAt = Date.now();
    });

    // A file's time is the sum of its top-level suites, hooks included.
    runner.on(EVENT_SUITE_BEGIN, (suite) => {
      if (isFileSuite(suite)) {
        this.suiteStarts.set(suite, Date.now());
      }
    });

    runner.on(EVENT_SUITE_END, (suite) => {
      const start = this.suiteStarts.get(suite);

      if (start === undefined) {
        return;
      }

      this.suiteStarts.delete(suite);
      this.fileDurations.set(suite.file, (this.fileDurations.get(suite.file) || 0) + (Date.now() - start));
    });

    // Mocha emits `retry` with the failed attempt and its error, then runs a clone of the test.
    runner.on(EVENT_TEST_RETRY, (test, error) => {
      const key = testKey(test);
      const errors = this.retriedErrors.get(key) || [];

      errors.push(firstLine(error));
      this.retriedErrors.set(key, errors);
    });

    runner.on(EVENT_TEST_END, (test) => {
      const key = testKey(test);

      this.tests.push({
        file: test.file || null,
        title: test.fullTitle(),
        state: test.state || (test.pending ? 'pending' : 'unknown'),
        durationMs: typeof test.duration === 'number' ? test.duration : null,
        attempts: test.currentRetry() + 1,
        retryErrors: this.retriedErrors.get(key) || [],
        error: test.state === 'failed' && test.err ? firstLine(test.err) : null,
      });
      this.retriedErrors.delete(key);
    });

    // Hook failures do not end a test, so record them on their own.
    runner.on(EVENT_TEST_FAIL, (runnable, error) => {
      if (runnable.type !== 'hook') {
        return;
      }

      this.hookFailures.push({
        file: runnable.file || runnable.parent?.file || null,
        title: runnable.fullTitle(),
        error: firstLine(error),
      });
    });

    runner.once(EVENT_RUN_END, () => this.write());
  }

  write() {
    if (!this.output) {
      return;
    }

    const results = {
      startedAt: this.startedAt ? new Date(this.startedAt).toISOString() : null,
      durationMs: this.startedAt ? Date.now() - this.startedAt : null,
      files: [...this.fileDurations].map(([file, durationMs]) => ({ file, durationMs })),
      tests: this.tests,
      hookFailures: this.hookFailures,
    };

    fs.mkdirSync(path.dirname(this.output), { recursive: true });
    fs.writeFileSync(this.output, JSON.stringify(results));
  }

  done(failures, callback) {
    if (typeof this.inner.done === 'function') {
      this.inner.done(failures, callback);

      return;
    }

    callback(failures);
  }
}

module.exports = NovuV2E2eReporter;
