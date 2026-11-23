/**
 * Builds the per-shard E2E report from the raw results of novu-v2-e2e-reporter.cjs, and renders its job summary.
 *
 * The report is one JSON file per shard with stable keys, so a later script can merge many runs:
 * - files: the time of each test file the shard was given (durationMs is null when the file did not run, e.g. after
 *   --bail stopped the run, or when its suites were registered under another file that imports it);
 * - tests: the time, result and attempt count of each test;
 * - flaky: tests that failed, then passed on the retry;
 * - failures: tests and hooks that failed.
 * Paths are relative to apps/api.
 */

const fs = require('node:fs');
const path = require('node:path');

const SCHEMA_VERSION = 1;
const SLOWEST_FILES_IN_SUMMARY = 5;

function toRelative(root, filePath) {
  if (!filePath) {
    return null;
  }

  return path.relative(root, filePath).split(path.sep).join('/');
}

function readRawResults(rawPath) {
  try {
    return JSON.parse(fs.readFileSync(rawPath, 'utf8'));
  } catch {
    return null;
  }
}

function summarizeFile(file, durationMs, tests) {
  const fileTests = tests.filter((test) => test.file === file);

  return {
    file,
    durationMs,
    tests: fileTests.length,
    passed: fileTests.filter((test) => test.state === 'passed').length,
    failed: fileTests.filter((test) => test.state === 'failed').length,
    pending: fileTests.filter((test) => test.state === 'pending').length,
    retried: fileTests.filter((test) => test.attempts > 1).length,
  };
}

/**
 * @param {object} input
 * @param {string} input.root - apps/api, the base for relative paths
 * @param {string} input.rawPath - the reporter's raw JSON
 * @param {string[]} input.assignedFiles - the files the shard was given, relative to root
 * @param {object} input.meta - shard, edition, retries, commit and run details
 * @param {number|null} input.exitCode - mocha's exit code
 */
function buildReport({ root, rawPath, assignedFiles, meta, exitCode }) {
  const raw = readRawResults(rawPath);
  const tests = (raw?.tests || []).map((test) => ({
    file: toRelative(root, test.file),
    title: test.title,
    state: test.state,
    durationMs: test.durationMs,
    attempts: test.attempts,
    retryErrors: test.retryErrors,
    error: test.error,
  }));
  const fileDurations = new Map((raw?.files || []).map((entry) => [toRelative(root, entry.file), entry.durationMs]));
  const files = assignedFiles.map((file) => summarizeFile(file, fileDurations.get(file) ?? null, tests));

  const flaky = tests
    .filter((test) => test.state === 'passed' && test.attempts > 1)
    .map((test) => ({
      file: test.file,
      title: test.title,
      attempts: test.attempts,
      error: test.retryErrors[0] || null,
    }));

  const failures = [
    ...tests
      .filter((test) => test.state === 'failed')
      .map((test) => ({ kind: 'test', file: test.file, title: test.title, error: test.error })),
    ...(raw?.hookFailures || []).map((hook) => ({
      kind: 'hook',
      file: toRelative(root, hook.file),
      title: hook.title,
      error: hook.error,
    })),
  ];

  return {
    schemaVersion: SCHEMA_VERSION,
    ...meta,
    startedAt: raw?.startedAt ?? null,
    durationMs: raw?.durationMs ?? null,
    exitCode,
    // False when mocha crashed before writing results, or when it failed with files left that never ran (--bail).
    // A passing run is complete even if a file has no time: its suites can be registered under the file that
    // imports it (generate-preview.e2e.ts imports workflow.controller.e2e.ts).
    complete: Boolean(raw) && (exitCode === 0 || files.every((file) => file.durationMs !== null)),
    files,
    tests: tests.map(({ retryErrors, ...test }) => test),
    flaky,
    failures,
  };
}

function formatSeconds(durationMs) {
  return durationMs === null ? '—' : `${(durationMs / 1000).toFixed(1)} s`;
}

function escapeCell(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ');
}

function renderSummary(report) {
  const { shard, edition } = report;
  const ran = report.files.filter((file) => file.durationMs !== null).length;
  const lines = [
    `### API E2E shard ${shard.index}/${shard.total} (${edition.toUpperCase()})`,
    '',
    `${ran} of ${report.files.length} files ran in ${formatSeconds(report.durationMs)}. ` +
      `${report.tests.length} tests, ${report.failures.length} failures (tests and hooks), ` +
      `${report.flaky.length} passed only on a retry.`,
  ];

  if (!report.complete) {
    lines.push('', '> Not every file ran (a failure stopped the run, or mocha crashed), so the timings are partial.');
  }

  lines.push('');

  if (report.flaky.length > 0) {
    lines.push(
      `**Flaky: failed first, passed on a retry (${report.flaky.length})**`,
      '',
      '| File | Test | Attempts | First error |',
      '|---|---|---:|---|',
      ...report.flaky.map(
        (test) =>
          `| \`${escapeCell(test.file)}\` | ${escapeCell(test.title)} | ${test.attempts} | ${escapeCell(test.error)} |`
      ),
      ''
    );
  } else {
    lines.push('No test needed a retry.', '');
  }

  if (report.failures.length > 0) {
    lines.push(
      `**Failed (${report.failures.length})**`,
      '',
      '| File | Test | Error |',
      '|---|---|---|',
      ...report.failures.map(
        (failure) => `| \`${escapeCell(failure.file)}\` | ${escapeCell(failure.title)} | ${escapeCell(failure.error)} |`
      ),
      ''
    );
  }

  const slowest = report.files
    .filter((file) => file.durationMs !== null)
    .sort((left, right) => right.durationMs - left.durationMs)
    .slice(0, SLOWEST_FILES_IN_SUMMARY);

  if (slowest.length > 0) {
    lines.push(
      '<details><summary>Slowest files</summary>',
      '',
      '| File | Time | Tests |',
      '|---|---:|---:|',
      ...slowest.map((file) => `| \`${file.file}\` | ${formatSeconds(file.durationMs)} | ${file.tests} |`),
      '',
      '</details>',
      ''
    );
  }

  return `${lines.join('\n')}\n`;
}

module.exports = { buildReport, renderSummary };
