#!/usr/bin/env node
// Counts the net test lines a pull request adds (added - removed) and checks them against a budget.
// Over the budget, the PR description needs a "Test budget: <reason>" line.
//
// Input (environment):
//   PR_FILES_JSON        path to the PR file list: `gh api --paginate --slurp repos/{repo}/pulls/{n}/files`
//   PR_CHANGED_FILES     the PR's `changed_files` count, to detect a truncated list
//   PR_BODY              the PR description (untrusted, read only as data)
//   TEST_LINE_BUDGET     net test lines allowed without a reason (default 400)
//   TEST_LINE_BUDGET_BLOCKING  'true' fails the check over budget; anything else only warns
//   GITHUB_STEP_SUMMARY  optional, the job summary file
//
// The script never fails because of missing or bad input: it warns that it could not count.
// Exit code 1 happens only when blocking is on and the PR is over budget without a reason.

import { appendFileSync, readFileSync } from 'node:fs';

const TITLE = 'Test line budget';
// GitHub lists at most 3000 files for a pull request.
const API_FILE_LIMIT = 3000;
const MIN_REASON_LENGTH = 10;
const CODE_EXTENSION = /\.[cm]?[jt]sx?$/;

// Test files by name.
const TEST_FILE = /\.(spec|test|e2e|e2e-ee)\.[cm]?[jt]sx?$/;
// Test helpers by name, e.g. queue-backend.test-helpers.ts, cache-service.mock.ts, reply.fixture.ts.
const TEST_HELPER_FILE = /\.(test-helpers?|mocks?|fixtures?)\.[cm]?[jt]sx?$/;
// Folders that hold only test code: per-module API e2e/ folders and their helpers, apps/*/e2e setup,
// apps/dashboard/tests (Playwright), apps/mcp-server/test, and fixture or mock folders.
const TEST_FOLDER = /(^|\/)(e2e|tests?|__tests__|__mocks__|__fixtures__|fixtures)\//;
// The shared test harness (see .cursor/rules/testing.mdc).
const TEST_PACKAGE = /^libs\/testing\//;

// Never counted: snapshots and generated code.
const EXCLUDED = [/(^|\/)__snapshots__\//, /\.snap$/, /^libs\/internal-sdk\//];

export function isTestPath(path) {
  if (typeof path !== 'string' || EXCLUDED.some((pattern) => pattern.test(path))) {
    return false;
  }

  if (TEST_FILE.test(path) || TEST_HELPER_FILE.test(path)) {
    return true;
  }

  return CODE_EXTENSION.test(path) && (TEST_FOLDER.test(path) || TEST_PACKAGE.test(path));
}

// A renamed file counts when its old or new path is a test path.
function countsAsTest(file) {
  return isTestPath(file.filename) || isTestPath(file.previous_filename);
}

/**
 * @param {unknown} files flat list of PR files from the GitHub API
 * @param {number} changedFiles the PR's changed_files count
 * @returns {{ ok: true, net: number, added: number, removed: number, testFiles: Array<{ path: string, net: number }> } | { ok: false, reason: string }}
 */
export function countTestLines(files, changedFiles) {
  if (!Array.isArray(files)) {
    return { ok: false, reason: 'the PR file list could not be read from the GitHub API' };
  }

  if (files.length >= API_FILE_LIMIT || files.length !== changedFiles) {
    return {
      ok: false,
      reason: `the API listed ${files.length} files but the PR changes ${changedFiles} (the API lists at most ${API_FILE_LIMIT})`,
    };
  }

  let added = 0;
  let removed = 0;
  const testFiles = [];

  for (const file of files) {
    if (!file || typeof file.filename !== 'string') {
      return { ok: false, reason: 'a file in the PR file list has no name' };
    }

    if (!countsAsTest(file)) {
      continue;
    }

    if (!Number.isInteger(file.additions) || !Number.isInteger(file.deletions)) {
      return { ok: false, reason: `${file.filename} has no line counts` };
    }

    added += file.additions;
    removed += file.deletions;
    testFiles.push({ path: file.filename, net: file.additions - file.deletions });
  }

  testFiles.sort((a, b) => b.net - a.net);

  return { ok: true, net: added - removed, added, removed, testFiles };
}

/**
 * Finds a `Test budget: <reason>` line. Markdown around the label is allowed:
 * `## Test budget: ...`, `- **Test budget:** ...`.
 * @returns {string | null} the reason, or null when there is no line with a real reason
 */
export function findBudgetReason(body) {
  if (typeof body !== 'string') {
    return null;
  }

  for (const line of body.split(/\r?\n/)) {
    const match = line.match(/^[\s>#*_-]*test budget\s*[*_]*\s*:\s*[*_]*\s*(.*)$/i);
    if (!match) {
      continue;
    }

    const reason = match[1].replace(/<!--.*?-->/g, '').trim();
    if (reason.length >= MIN_REASON_LENGTH) {
      return reason;
    }
  }

  return null;
}

/**
 * @returns {{ level: 'notice' | 'warning' | 'error', message: string, summary: string, fail: boolean }}
 */
export function evaluate({ files, changedFiles, body, budget, blocking }) {
  const count = countTestLines(files, changedFiles);

  if (!count.ok) {
    const message = `Could not count test lines: ${count.reason}. The check is skipped.`;

    return { level: 'warning', message, summary: `${TITLE}: ${message}`, fail: false };
  }

  const head = `${TITLE}: ${count.net} net test lines (+${count.added} −${count.removed}) in ${count.testFiles.length} test files; budget ${budget}.`;

  if (count.net <= budget) {
    return { level: 'notice', message: head, summary: head, fail: false };
  }

  const reason = findBudgetReason(body);
  const topFiles = count.testFiles
    .slice(0, 10)
    .map((file) => `| \`${file.path}\` | ${file.net} |`)
    .join('\n');
  const table = `| File | Net lines |\n| --- | --- |\n${topFiles}`;

  if (reason) {
    const message = `${head} Over budget, with a reason in the PR description.`;

    return {
      level: 'notice',
      message,
      summary: `${message}\n\n> Test budget: ${reason}\n\n${table}\n`,
      fail: false,
    };
  }

  const message = `${head} Over budget by ${count.net - budget}. Remove test lines, or add a "Test budget: <reason>" line to the PR description.`;

  return {
    level: blocking ? 'error' : 'warning',
    message,
    summary: `${message}\n\n${table}\n`,
    fail: blocking,
  };
}

function readFiles(path) {
  try {
    // `--slurp` gives one array per page.
    return JSON.parse(readFileSync(path, 'utf8')).flat();
  } catch {
    return null;
  }
}

// Workflow commands end at a newline, and % must be escaped.
function escapeCommand(text) {
  return text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

function main() {
  const { env } = process;
  const budget = Number.parseInt(env.TEST_LINE_BUDGET ?? '400', 10);
  const result = evaluate({
    files: env.PR_FILES_JSON ? readFiles(env.PR_FILES_JSON) : null,
    changedFiles: Number.parseInt(env.PR_CHANGED_FILES ?? '', 10),
    body: env.PR_BODY ?? '',
    budget: Number.isInteger(budget) ? budget : 400,
    blocking: env.TEST_LINE_BUDGET_BLOCKING === 'true',
  });

  console.log(`::${result.level} title=${TITLE}::${escapeCommand(result.message)}`);

  if (env.GITHUB_STEP_SUMMARY) {
    appendFileSync(env.GITHUB_STEP_SUMMARY, `${result.summary}\n`);
  }

  if (result.fail) {
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
