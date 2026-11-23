#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { buildReport, renderSummary } = require('./novu-v2-e2e-report.cjs');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_SHARD_INDEX = 1;
const DEFAULT_TOTAL_SHARDS = 1;
const NOVU_V2_TAG = '#novu-v2';
const TEST_CASE_PATTERN = /\bit(?:\.only)?\s*\(/g;
const DEFAULT_MOCHA_REPORTER = process.env.CI ? 'dot' : 'spec';
const MOCHA_REPORTER = process.env.NOVU_V2_MOCHA_REPORTER || DEFAULT_MOCHA_REPORTER;
// One retry: a flaky test can still pass, and the report lists it under `flaky`.
const MOCHA_RETRIES = 1;
const REPORTER_PATH = path.join(__dirname, 'novu-v2-e2e-reporter.cjs');

// CE fork PRs run with CI_EE_TEST=false, so cloud-EE-only behavior (outbound SSRF
// pinning, Stripe billing periods, RBAC permissions, translations, novu-app MCP)
// is unavailable. Exclude mixed files that contain those tests.
const CE_EXCLUDED_FILES = new Set([
  'src/app/agents/e2e/active-conversations.e2e.ts',
  'src/app/agents/e2e/agent-mcp-servers.e2e.ts',
  'src/app/auth/e2e/permissions.guard.e2e.ts',
  'src/app/bridge/e2e/sync.e2e.ts',
  'src/app/environments-v1/e2e/api-key-environments-exposure.e2e.ts',
  'src/app/environments-v2/e2e/environments-v2-diff.e2e.ts',
  'src/app/events/e2e/trigger-event-ssrf.e2e.ts',
  'src/app/organization/e2e/update-organization-settings.e2e.ts',
  'src/app/workflows-v2/e2e/test-http-endpoint.e2e.ts',
]);

const MOCHA_ARGS = [
  '--timeout',
  '30000',
  '--retries',
  String(MOCHA_RETRIES),
  ...(process.env.CI ? ['--bail'] : []),
  '--grep',
  NOVU_V2_TAG,
  '--require',
  '@novu/testing/swc-register',
  '--exit',
  '--file',
  'e2e/setup.ts',
];

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function compareFileNames(left, right) {
  return left.localeCompare(right);
}

function readSortedEntries(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
}

function getCliArgs() {
  return process.argv.slice(2).filter((arg) => arg !== '--');
}

function parseCeOnly() {
  const args = getCliArgs();

  return args.includes('--ce-only') || process.env.NOVU_V2_CE_ONLY === 'true';
}

function getTestFilePattern(ceOnly) {
  return ceOnly ? /\.e2e\.ts$/ : /\.e2e(-ee)?\.ts$/;
}

function collectTestFileRoots(ceOnly) {
  const roots = [path.join(ROOT, 'src')];

  if (!ceOnly) {
    roots.push(path.join(ROOT, 'e2e', 'enterprise'));
  }

  return roots;
}

function collectTestFiles(ceOnly, dir, files = []) {
  const testFilePattern = getTestFilePattern(ceOnly);

  if (!fs.existsSync(dir)) {
    return files;
  }

  for (const entry of readSortedEntries(dir)) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      collectTestFiles(ceOnly, fullPath, files);
      continue;
    }

    if (testFilePattern.test(entry.name)) {
      files.push(toPosixPath(path.relative(ROOT, fullPath)));
    }
  }

  return files;
}

function parseShardValue(rawValue) {
  const [shardIndex, totalShards] = rawValue.split('/').map((value) => Number(value));

  if (!Number.isInteger(shardIndex) || !Number.isInteger(totalShards)) {
    throw new Error(`Invalid shard config: ${rawValue}`);
  }

  return { shardIndex, totalShards };
}

function parseShardConfig() {
  const args = getCliArgs();
  const shardArg = args.find((arg) => arg.startsWith('--shard='));
  const listOnly = args.includes('--list');
  const envShardIndex = Number(process.env.NOVU_V2_SHARD_INDEX || DEFAULT_SHARD_INDEX);
  const envTotalShards = Number(process.env.NOVU_V2_TOTAL_SHARDS || DEFAULT_TOTAL_SHARDS);
  const shardConfig = shardArg ? parseShardValue(shardArg.slice('--shard='.length)) : null;
  const shardIndex = shardConfig?.shardIndex ?? envShardIndex;
  const totalShards = shardConfig?.totalShards ?? envTotalShards;

  if (!Number.isInteger(shardIndex) || !Number.isInteger(totalShards) || shardIndex < 1 || totalShards < 1) {
    throw new Error(`Invalid shard config: ${shardIndex}/${totalShards}`);
  }

  if (shardIndex > totalShards) {
    throw new Error(`Shard index ${shardIndex} is greater than shard count ${totalShards}`);
  }

  return { listOnly, shardIndex, totalShards };
}

function applyDefaultEnv() {
  if (!process.env.CI) {
    return;
  }

  const defaults = {
    LOG_LEVEL: 'fatal',
    NEW_RELIC_ENABLED: 'false',
    NODE_NO_WARNINGS: '1',
  };

  for (const [key, value] of Object.entries(defaults)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function countTestCases(source) {
  return Math.max((source.match(TEST_CASE_PATTERN) || []).length, 1);
}

function compareWeightedFiles(left, right) {
  return right.weight - left.weight || compareFileNames(left.relativePath, right.relativePath);
}

function isCeExcludedFile(relativePath) {
  return CE_EXCLUDED_FILES.has(relativePath);
}

function collectWeightedFiles(ceOnly) {
  const candidates = collectTestFileRoots(ceOnly).flatMap((dir) => collectTestFiles(ceOnly, dir));

  return candidates
    .map((relativePath) => {
      if (ceOnly && isCeExcludedFile(relativePath)) {
        return null;
      }

      const source = readSource(relativePath);

      if (!source.includes(NOVU_V2_TAG)) {
        return null;
      }

      return {
        relativePath,
        weight: countTestCases(source),
      };
    })
    .filter(Boolean)
    .sort(compareWeightedFiles);
}

function isLighterShard(candidate, current) {
  return (
    candidate.weight < current.weight ||
    (candidate.weight === current.weight && candidate.files.length < current.files.length)
  );
}

function pickLightestShard(shards) {
  let targetIndex = 0;

  for (let index = 1; index < shards.length; index += 1) {
    if (isLighterShard(shards[index], shards[targetIndex])) {
      targetIndex = index;
    }
  }

  return shards[targetIndex];
}

function buildShards(weightedFiles, totalShards) {
  const shards = Array.from({ length: totalShards }, () => ({ weight: 0, files: [] }));

  for (const file of weightedFiles) {
    const targetShard = pickLightestShard(shards);
    targetShard.files.push(file.relativePath);
    targetShard.weight += file.weight;
  }

  return shards.map((shard) => ({
    weight: shard.weight,
    files: shard.files.sort(compareFileNames),
  }));
}

function getShard(weightedFiles, shardIndex, totalShards) {
  return buildShards(weightedFiles, totalShards)[shardIndex - 1];
}

function printShardSummary(shardIndex, totalShards, shard, ceOnly) {
  const suiteLabel = ceOnly ? 'Novu V2 CE E2E' : 'Novu V2 E2E';
  console.log(
    `Running ${suiteLabel} shard ${shardIndex}/${totalShards} with ${shard.files.length} files (weight ${shard.weight}).`
  );
}

function getReporterArgs(rawResultsPath) {
  return [
    '--reporter',
    REPORTER_PATH,
    '--reporter-option',
    `inner=${MOCHA_REPORTER}`,
    '--reporter-option',
    `output=${rawResultsPath}`,
  ];
}

function runMocha(filePaths, rawResultsPath) {
  return spawnSync(
    process.execPath,
    [require.resolve('mocha/bin/mocha'), ...MOCHA_ARGS, ...getReporterArgs(rawResultsPath), ...filePaths],
    {
      cwd: ROOT,
      env: process.env,
      stdio: 'inherit',
    }
  );
}

function getCommitSha() {
  if (process.env.GITHUB_SHA) {
    return process.env.GITHUB_SHA;
  }

  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' });

  return result.status === 0 ? result.stdout.trim() : null;
}

function getReportMeta(shardIndex, totalShards, ceOnly) {
  return {
    shard: { index: shardIndex, total: totalShards },
    edition: ceOnly ? 'ce' : 'ee',
    retries: MOCHA_RETRIES,
    commit: getCommitSha(),
    headCommit: process.env.NOVU_V2_E2E_HEAD_SHA || null,
    runId: process.env.GITHUB_RUN_ID || null,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT ? Number(process.env.GITHUB_RUN_ATTEMPT) : null,
  };
}

/**
 * Writes the shard report when NOVU_V2_E2E_REPORT_DIR is set, and adds it to the GitHub job summary when there is
 * one. Never throws: a broken report must not hide the test result.
 */
function writeReport({ rawResultsPath, shard, shardIndex, totalShards, ceOnly, exitCode }) {
  const reportDir = process.env.NOVU_V2_E2E_REPORT_DIR;
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;

  if (!reportDir && !summaryPath) {
    return;
  }

  try {
    const report = buildReport({
      root: ROOT,
      rawPath: rawResultsPath,
      assignedFiles: shard.files,
      meta: getReportMeta(shardIndex, totalShards, ceOnly),
      exitCode,
    });

    if (reportDir) {
      const reportPath = path.resolve(
        reportDir,
        `novu-v2-e2e-${report.edition}-shard-${shardIndex}-of-${totalShards}.json`
      );
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
      console.log(`E2E report: ${reportPath}`);
    }

    if (summaryPath) {
      fs.appendFileSync(summaryPath, renderSummary(report));
    }
  } catch (error) {
    console.error(`Could not write the E2E report: ${error instanceof Error ? error.message : error}`);
  }
}

function run() {
  applyDefaultEnv();

  const ceOnly = parseCeOnly();
  const { listOnly, shardIndex, totalShards } = parseShardConfig();
  const shard = getShard(collectWeightedFiles(ceOnly), shardIndex, totalShards);

  if (!shard || shard.files.length === 0) {
    throw new Error(`No files assigned to shard ${shardIndex}/${totalShards}`);
  }

  printShardSummary(shardIndex, totalShards, shard, ceOnly);

  if (listOnly) {
    for (const file of shard.files) {
      console.log(file);
    }

    return;
  }

  const rawResultsPath = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'novu-v2-e2e-')),
    `shard-${shardIndex}-of-${totalShards}.json`
  );
  const result = runMocha(shard.files, rawResultsPath);
  const exitCode = result.status ?? 1;

  writeReport({ rawResultsPath, shard, shardIndex, totalShards, ceOnly, exitCode: result.error ? null : exitCode });

  if (result.error) {
    throw result.error;
  }

  process.exit(exitCode);
}

try {
  run();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
