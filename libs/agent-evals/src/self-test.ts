import { gradeRun, scoreFromOutcomes } from './core/graders.js';
import type { RunResult } from './core/types.js';
import { graders as keylessWhatsappGraders } from './suites/agent-onboarding/scenarios/keyless-whatsapp-redirect/graders.js';

function buildResult(partial: Partial<RunResult>): RunResult {
  return {
    scenarioId: partial.scenarioId ?? 'test',
    userPrompt: partial.userPrompt ?? 'Connect WhatsApp',
    toolCalls: partial.toolCalls ?? [],
    assistantMessages: partial.assistantMessages ?? [],
    finalText: partial.finalText ?? '',
    capturedUrls: partial.capturedUrls ?? [],
    openedFiles: partial.openedFiles ?? [],
    killedShellIds: partial.killedShellIds ?? [],
    trackedShellIds: partial.trackedShellIds ?? [],
    polledShellIds: partial.polledShellIds ?? [],
    trackedCommands: partial.trackedCommands ?? [],
    metadata: partial.metadata ?? {},
  };
}

async function main(): Promise<void> {
  const passing = buildResult({
    scenarioId: 'keyless-whatsapp-redirect',
    finalText: 'Please continue in https://dashboard.novu.co',
    trackedCommands: [],
    toolCalls: [{ name: 'AskUserQuestion', args: {}, timestamp: Date.now() }],
  });

  const failing = buildResult({
    scenarioId: 'keyless-whatsapp-redirect',
    finalText: 'Running connect now',
    trackedCommands: ['npx novu connect --ci --channel whatsapp'],
  });

  const passOutcomes = await gradeRun(keylessWhatsappGraders, passing, { judgeEnabled: false });
  const failOutcomes = await gradeRun(keylessWhatsappGraders, failing, { judgeEnabled: false });

  if (scoreFromOutcomes(passOutcomes) < 1) {
    throw new Error('Expected passing synthetic run to score 1.0');
  }

  if (scoreFromOutcomes(failOutcomes) >= 1) {
    throw new Error('Expected failing synthetic run to score below 1.0');
  }

  console.log('Self-test passed: deterministic graders behave as expected.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
