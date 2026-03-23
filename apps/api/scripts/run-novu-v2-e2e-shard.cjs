#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_SHARD_INDEX = 1;
const DEFAULT_TOTAL_SHARDS = 1;
const NOVU_V2_TAG = '#novu-v2';
const TEST_FILE_PATTERN = /\.e2e(-ee)?\.ts$/;
const TEST_CASE_PATTERN = /\bit(?:\.only)?\s*\(/g;
const DEFAULT_MOCHA_REPORTER = process.env.CI ? 'dot' : 'spec';
const MOCHA_REPORTER = process.env.NOVU_V2_MOCHA_REPORTER || DEFAULT_MOCHA_REPORTER;

const MOCHA_ARGS = [
  '--timeout',
  '30000',
  '--retries',
  '3',
  ...(process.env.CI ? ['--bail'] : []),
  '--reporter',
  MOCHA_REPORTER,
  '--grep',
  NOVU_V2_TAG,
  '--require',
  './swc-register.js',
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

function collectTestFiles(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }

  for (const entry of readSortedEntries(dir)) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      collectTestFiles(fullPath, files);
      continue;
    }

    if (TEST_FILE_PATTERN.test(entry.name)) {
      files.push(toPosixPath(path.relative(ROOT, fullPath)));
    }
  }

  return files;
}

function getCliArgs() {
  return process.argv.slice(2).filter((arg) => arg !== '--');
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

function collectWeightedFiles() {
  const candidates = [
    ...collectTestFiles(path.join(ROOT, 'src')),
    ...collectTestFiles(path.join(ROOT, 'e2e', 'enterprise')),
  ];

  return candidates
    .map((relativePath) => {
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
  return candidate.weight < current.weight || (candidate.weight === current.weight && candidate.files.length < current.files.length);
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

function printShardSummary(shardIndex, totalShards, shard) {
  console.log(`Running Novu V2 E2E shard ${shardIndex}/${totalShards} with ${shard.files.length} files (weight ${shard.weight}).`);
}

function runMocha(filePaths) {
  return spawnSync(process.execPath, [require.resolve('mocha/bin/mocha'), ...MOCHA_ARGS, ...filePaths], {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
  });
}

function run() {
  applyDefaultEnv();

  const { listOnly, shardIndex, totalShards } = parseShardConfig();
  const shard = getShard(collectWeightedFiles(), shardIndex, totalShards);

  if (!shard || shard.files.length === 0) {
    throw new Error(`No files assigned to shard ${shardIndex}/${totalShards}`);
  }

  printShardSummary(shardIndex, totalShards, shard);

  if (listOnly) {
    for (const file of shard.files) {
      console.log(file);
    }

    return;
  }

  const result = runMocha(shard.files);

  if (result.error) {
    throw result.error;
  }

  process.exit(result.status ?? 1);
}

try {
  run();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
