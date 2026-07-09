/**
 * Benchmark harness comparing the TypeScript 5.6.2 CLI (`tsc`) against the
 * TypeScript 7.0 native compiler (`tsgo`, from @typescript/native-preview`).
 *
 * Both compilers run against the same primary tsconfig per project (type-check
 * only via `--noEmit`, or `tsgo -b` for dashboard). Migrated packages use `tsgo`
 * in production builds; root `tsc` 5.6.2 is kept only as a benchmark baseline
 * and for packages that still require the programmatic API.
 *
 * Usage: node scripts/benchmark-tsgo.mjs [--runs N] [--warmup N]
 */
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TSC = path.join(ROOT, 'node_modules/.bin/tsc');
const TSGO = path.join(ROOT, 'node_modules/.bin/tsgo');

const argv = process.argv.slice(2);
const getArg = (name, def) => {
  const i = argv.indexOf(name);

  return i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : def;
};
const RUNS = getArg('--runs', 3);
const WARMUP = getArg('--warmup', 1);

const PROJECTS = [
  { name: '@novu/shared', dir: 'packages/shared', args: ['-p', 'tsconfig.json', '--noEmit'], mode: 'type-check' },
  { name: '@novu/dal', dir: 'libs/dal', args: ['-p', 'tsconfig.build.json', '--noEmit'], mode: 'type-check' },
  { name: '@novu/dashboard', dir: 'apps/dashboard', args: ['-b'], mode: 'type-check (-b)', clean: true },
  { name: '@novu/inbound-mail', dir: 'apps/inbound-mail', args: ['-p', 'tsconfig.json', '--noEmit'], mode: 'type-check' },
  { name: '@novu/stateless', dir: 'packages/stateless', args: ['-p', 'tsconfig.json', '--noEmit'], mode: 'type-check' },
  { name: '@novu/chat-sdk-adapter', dir: 'packages/chat-adapter', args: ['-p', 'tsconfig.json', '--noEmit'], mode: 'type-check' },
  { name: '@novu/testing', dir: 'libs/testing', args: ['-p', 'tsconfig.build.json', '--noEmit'], mode: 'type-check' },
  { name: '@novu/notifications', dir: 'libs/notifications', args: ['-p', 'tsconfig.json', '--noEmit'], mode: 'type-check' },
  { name: '@novu/ee-api', dir: 'enterprise/packages/api', args: ['-p', 'tsconfig.json', '--noEmit'], mode: 'type-check' },
];

const TOOLS = [
  { label: 'tsc 5.6.2', bin: TSC },
  { label: 'tsgo 7.0', bin: TSGO },
];

const log = [];
const record = (line) => {
  log.push(line);
  console.log(line);
};

function version(bin) {
  return spawnSync(bin, ['--version'], { encoding: 'utf8' }).stdout.trim();
}

function cleanBuildInfo(dir) {
  const abs = path.join(ROOT, dir);
  for (const file of readdirSync(abs)) {
    if (file.endsWith('.tsbuildinfo')) rmSync(path.join(abs, file));
  }
}

function timeRun(bin, args, dir) {
  const start = performance.now();
  const res = spawnSync(bin, args, { cwd: path.join(ROOT, dir), encoding: 'utf8' });
  const ms = performance.now() - start;

  return { ms, code: res.status, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
}

function median(nums) {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

record(`TypeScript compiler build-time benchmark`);
record(`tsc:  ${version(TSC)}`);
record(`tsgo: ${version(TSGO)}`);
record(`runs=${RUNS} warmup=${WARMUP} cpus=${(await import('node:os')).cpus().length}`);
record('');

const results = [];
for (const project of PROJECTS) {
  for (const tool of TOOLS) {
    const times = [];
    let failed = false;
    for (let i = 0; i < WARMUP + RUNS; i += 1) {
      if (project.clean) cleanBuildInfo(project.dir);
      const run = timeRun(tool.bin, project.args, project.dir);
      const isWarmup = i < WARMUP;
      if (run.code !== 0) {
        failed = true;
        record(`  ${project.name} | ${tool.label} | run ${i} FAILED exit=${run.code}`);
        record(run.stdout.split('\n').slice(0, 10).join('\n'));
        record(run.stderr.split('\n').slice(0, 10).join('\n'));
      }
      if (!isWarmup && run.code === 0) times.push(run.ms);
      record(`  ${project.name} | ${tool.label} | run ${i}${isWarmup ? ' (warmup)' : ''} | ${(run.ms / 1000).toFixed(2)}s | exit=${run.code}`);
    }
    results.push({
      project: project.name,
      mode: project.mode,
      tool: tool.label,
      min: times.length ? Math.min(...times) : null,
      median: times.length ? median(times) : null,
      failed,
    });
  }
  record('');
}

function fmt(ms) {
  return ms == null ? 'n/a' : `${(ms / 1000).toFixed(2)}s`;
}

const lines = [];
lines.push('# TypeScript 5.6.2 (`tsc`) vs TypeScript 7.0 (`tsgo`) build-time benchmark');
lines.push('');
lines.push(`- \`tsc\`: ${version(TSC)} (baseline only — not used by migrated packages)`);
lines.push(`- \`tsgo\`: ${version(TSGO)} (\`@typescript/native-preview\`) — production compiler for migrated packages`);
lines.push(`- Samples: ${RUNS} timed runs (+${WARMUP} warm-up discarded), median reported`);
lines.push('- Migrated packages use `tsgo` exclusively in build/typecheck scripts');
lines.push('');
lines.push('| Project | Mode | `tsc` 5.6.2 (median) | `tsgo` 7.0 (median) | Speedup |');
lines.push('| --- | --- | --- | --- | --- |');

for (const project of PROJECTS) {
  const tscRes = results.find((r) => r.project === project.name && r.tool === 'tsc 5.6.2');
  const tsgoRes = results.find((r) => r.project === project.name && r.tool === 'tsgo 7.0');
  const speedup =
    tscRes.median && tsgoRes.median ? `${(tscRes.median / tsgoRes.median).toFixed(1)}x` : 'n/a';
  lines.push(`| \`${project.name}\` | ${project.mode} | ${fmt(tscRes.median)} | ${fmt(tsgoRes.median)} | **${speedup}** |`);
}
lines.push('');

const md = lines.join('\n');
writeFileSync(path.join(ROOT, 'scripts/tsgo-benchmark-results.md'), `${md}\n`);
writeFileSync(path.join(ROOT, 'scripts/tsgo-benchmark-raw.log'), `${log.join('\n')}\n`);

console.log('\n' + md);
