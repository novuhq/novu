import { defineConfig } from 'vitest/config';

const concurrency = Number.parseInt(process.env.NOVU_EVAL_CONCURRENCY ?? '', 10);
const maxConcurrency = Number.isFinite(concurrency) && concurrency > 0 ? concurrency : 4;

export default defineConfig({
  test: {
    include: ['src/**/*.eval.ts'],
    testTimeout: 300_000,
    hookTimeout: 60_000,
    // vitest-evals/reporter extends VerboseReporter and prints compact, human-readable
    // per-grader scores + reasons. The stock 'default' reporter additionally dumps the
    // full RunResult JSON inside the threshold AssertionError, so we omit it here.
    reporters: ['vitest-evals/reporter'],
    // Scenarios are independent and dominated by live-model latency, so run them
    // concurrently. maxConcurrency caps in-flight requests to respect API rate limits.
    sequence: { concurrent: true },
    maxConcurrency,
    env: {
      VITEST_EVALS_REPLAY_MODE: process.env.VITEST_EVALS_REPLAY_MODE ?? 'off',
      VITEST_EVALS_REPLAY_DIR: '.vitest-evals/recordings',
    },
  },
});
