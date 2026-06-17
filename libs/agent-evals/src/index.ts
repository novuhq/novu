import './load-env.js';
import { writeScoresFile } from './core/reporters.js';
import { averageScore, filterScenarios, runAllEvaluations } from './core/runner.js';
import type { RunnerOptions } from './core/types.js';
import { DEFAULT_SUITE, getSuite, listSuiteIds } from './suites/registry.js';

function parseArgs(argv: string[]): RunnerOptions {
  const options: RunnerOptions = {
    suite: DEFAULT_SUITE,
    model: 'claude-sonnet-4-5',
    judge: Boolean(process.env.ANTHROPIC_API_KEY),
    debug: false,
    dry: false,
    smoke: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--suite' || arg === '-s') {
      options.suite = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--scenario' || arg === '-e') {
      options.scenarioFilter = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--model') {
      options.model = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--judge') {
      options.judge = true;
      continue;
    }

    if (arg === '--no-judge') {
      options.judge = false;
      continue;
    }

    if (arg === '--judge-model') {
      options.judgeModel = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--smoke') {
      options.smoke = true;
      continue;
    }

    if (arg === '--debug' || arg === '-d') {
      options.debug = true;
      continue;
    }

    if (arg === '--dry') {
      options.dry = true;
      continue;
    }

    if (arg === '--fail-under') {
      options.failUnder = Number(argv[index + 1]);
      index += 1;
    }
  }

  return options;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const suite = getSuite(options.suite);

  if (!suite) {
    console.error(`Unknown suite "${options.suite}". Available: ${listSuiteIds().join(', ')}`);
    process.exit(1);

    return;
  }

  if (options.dry) {
    const selected = filterScenarios(suite, options.scenarioFilter);
    const shown = options.smoke ? selected.slice(0, 1) : selected;

    console.log(`${suite.id} eval dry run`);
    console.log(`Model: ${options.model}`);
    console.log(`Judge: ${options.judge ? 'enabled' : 'disabled'}`);
    console.log(`Scenarios: ${shown.length}`);

    for (const entry of shown) {
      console.log(`- ${entry.scenario.id}: ${entry.scenario.description}`);
    }

    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is required to run agent evals.');
    process.exit(1);

    return;
  }

  const scores = await runAllEvaluations(suite, options);
  const outputPath = await writeScoresFile(suite.id, scores);
  console.log(`Wrote ${outputPath}`);

  if (options.failUnder !== undefined) {
    const average = averageScore(scores) * 100;

    if (average < options.failUnder) {
      console.error(`Average score ${average.toFixed(1)}% is below fail-under threshold ${options.failUnder}%`);
      process.exit(1);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
