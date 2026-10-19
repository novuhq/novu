import '../../load-env.js';
import { describeEval } from 'vitest-evals';
import { gradersToJudges } from './adapters.js';
import { loadSuiteSystemPrompt, scenarioHarness } from './harness.js';
import { agentOnboardingSuite } from './index.js';

const JUDGE_THRESHOLD = 0.8;
const system = await loadSuiteSystemPrompt(agentOnboardingSuite);

for (const entry of agentOnboardingSuite.scenarios) {
  const harness = scenarioHarness({
    suite: agentOnboardingSuite,
    scenario: entry.scenario,
    system,
  });

  describeEval(
    entry.scenario.id,
    {
      harness,
      judges: gradersToJudges(entry.graders),
      judgeThreshold: JUDGE_THRESHOLD,
      skipIf: () => !process.env.ANTHROPIC_API_KEY,
    },
    (it) => {
      it(entry.scenario.description, async ({ run }) => {
        await run(entry.scenario.userPrompt);
      });
    }
  );
}
