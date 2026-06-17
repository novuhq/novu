import { defineGraders, fail, judge, labeled, toolCallsNamed, transcriptText } from '../../core/graders.js';
import { isForbiddenWatcherCommand } from '../../core/recorder.js';
import type { GraderOutcome, RunResult } from '../../core/types.js';

/** The drafted agent description is captured into metadata by the suite's onTrackedCommand hook. */
export function descriptionText(result: RunResult): string {
  return typeof result.metadata.description === 'string' ? result.metadata.description : '';
}

export function connectCommands(result: RunResult): string[] {
  return result.trackedCommands;
}

function firstConnectCall(result: RunResult) {
  return result.toolCalls.find((call) => call.name === 'Bash' && /\bconnect\b/.test(String(call.args.command ?? '')));
}

export const judgePrompts = {
  personaAudienceFit:
    'Does the drafted agent description frame the agent for the product end-user audience in domain language, without drifting into a developer/coding-assistant persona?',
  noInfraMcpSemantic:
    'Does the drafted agent description avoid naming internal infrastructure or backend plumbing (databases, email delivery APIs, queues, caches, dev tooling) even via synonyms?',
  conclusionFirstReport:
    'You are given only the final user-facing message. Does its first line/sentence state the CLI result (success or failure), followed by the single next action (claim link for keyless or dashboard for authenticated), without leading with setup steps or process narration?',
};

export const catalog = {
  noSecretKeyFlag: (result: RunResult): GraderOutcome | 'pass' =>
    connectCommands(result).every((cmd) => !/--secret-key\b/.test(cmd) && !/\bNOVU_SECRET_KEY=/.test(cmd))
      ? 'pass'
      : fail('a connect command passed --secret-key or NOVU_SECRET_KEY'),

  usedLoginWhenDashboardPrompt: (result: RunResult): GraderOutcome | 'pass' => {
    if (!/signed in to the Novu dashboard/i.test(result.userPrompt)) {
      return 'pass';
    }

    return connectCommands(result).some((cmd) => /--login\b/.test(cmd))
      ? 'pass'
      : fail('user was signed into the dashboard but no connect command used --login');
  },

  backgroundConnectShell: (result: RunResult): GraderOutcome | 'pass' => {
    const connectCall = firstConnectCall(result);

    if (!connectCall) {
      return fail('no connect command was run');
    }

    if (!connectCall.args.run_in_background) {
      return fail('connect command was not run in the background (run_in_background was not set)');
    }

    return result.polledShellIds.length > 0
      ? 'pass'
      : fail('background connect shell was never polled with BashOutput');
  },

  noTimersNoWatchers: (result: RunResult): GraderOutcome | 'pass' => {
    const forbiddenCall = result.toolCalls.find((call) => {
      if (call.name !== 'Bash') {
        return false;
      }

      const command = String(call.args.command ?? '');

      return isForbiddenWatcherCommand(command);
    });

    if (forbiddenCall) {
      return fail(`used a timer/watcher command: ${String(forbiddenCall.args.command ?? '')}`);
    }

    const readLogCall = result.toolCalls.find((call) => {
      if (call.name !== 'Read') {
        return false;
      }

      const filePath = String(call.args.file_path ?? '');

      return filePath.includes('/tmp/') || filePath.endsWith('.log');
    });

    return readLogCall
      ? fail(`tailed a log file instead of polling: ${String(readLogCall.args.file_path ?? '')}`)
      : 'pass';
  },

  usedPickerForDecisions: (result: RunResult): GraderOutcome | 'pass' =>
    toolCallsNamed(result, 'AskUserQuestion').length >= 1
      ? 'pass'
      : fail('no AskUserQuestion picker was used for decisions'),

  pastedLiteralUrl:
    (expectedUrl: string) =>
    (result: RunResult): GraderOutcome | 'pass' =>
      result.capturedUrls.includes(expectedUrl) || transcriptText(result).includes(expectedUrl)
        ? 'pass'
        : fail(`expected URL not surfaced to the user: ${expectedUrl}`),

  descriptionExcludesInfraTokens:
    (tokens: string[]) =>
    (result: RunResult): GraderOutcome | 'pass' => {
      const description = descriptionText(result).toLowerCase();
      const offending = tokens.filter((token) => description.includes(token.toLowerCase()));

      return offending.length > 0 ? fail(`description mentions infra tokens: ${offending.join(', ')}`) : 'pass';
    },

  descriptionIncludesTokens:
    (tokens: string[]) =>
    (result: RunResult): GraderOutcome | 'pass' => {
      const description = descriptionText(result).toLowerCase();

      return tokens.some((token) => description.includes(token.toLowerCase()))
        ? 'pass'
        : fail(`description is missing all expected tokens: ${tokens.join(', ')}`);
    },

  noConnectOnKeylessWhatsapp: (result: RunResult): GraderOutcome | 'pass' => {
    if (connectCommands(result).length > 0) {
      return fail('ran a connect command on a keyless WhatsApp flow that should redirect to the dashboard');
    }

    return /dashboard\.novu\.co|dashboard redirect|continue.*dashboard/i.test(transcriptText(result))
      ? 'pass'
      : fail('did not direct the user to the dashboard');
  },

  confirmedBeforeRun: (result: RunResult): GraderOutcome | 'pass' => {
    const approveIndex = result.toolCalls.findIndex(
      (call) =>
        call.name === 'AskUserQuestion' &&
        (call.result as { selectedId?: string } | undefined)?.selectedId === 'approve'
    );
    const firstConnectIndex = result.toolCalls.findIndex(
      (call) => call.name === 'Bash' && /\bconnect\b/.test(String(call.args.command ?? ''))
    );

    if (firstConnectIndex === -1) {
      return 'pass';
    }

    return approveIndex !== -1 && approveIndex < firstConnectIndex
      ? 'pass'
      : fail('ran connect without an approved confirmation picker beforehand');
  },

  qrHostAware: (result: RunResult): GraderOutcome | 'pass' =>
    result.openedFiles.some((file) => file.endsWith('.png')) ? 'pass' : fail('did not open the QR code image'),

  reranWithSlackToken: (result: RunResult): GraderOutcome | 'pass' =>
    connectCommands(result).some((cmd) => /--slack-config-token\b/.test(cmd))
      ? 'pass'
      : fail('did not re-run connect with --slack-config-token'),

  killedFirstConnectShell: (result: RunResult): GraderOutcome | 'pass' =>
    result.killedShellIds.length >= 1 ? 'pass' : fail('the first connect shell was never killed'),

  readAuthUrlFile: (result: RunResult): GraderOutcome | 'pass' =>
    result.toolCalls.some(
      (call) => call.name === 'Read' && String(call.args.file_path ?? '').includes('novu-connect-auth-url')
    ) ||
    result.capturedUrls.some((url) => url.includes('/oauth/device')) ||
    transcriptText(result).includes('/oauth/device')
      ? 'pass'
      : fail('never read the auth-url file or surfaced the /oauth/device URL'),

  reportedSuccess: (result: RunResult): GraderOutcome | 'pass' =>
    /your agent is live|agent is live/i.test(transcriptText(result))
      ? 'pass'
      : fail('final report did not confirm the agent is live'),

  noConnectCommands: (result: RunResult): GraderOutcome | 'pass' =>
    connectCommands(result).length === 0 ? 'pass' : fail('ran a connect command when none was expected'),

  usedSecureTokenPath: (result: RunResult): GraderOutcome | 'pass' =>
    connectCommands(result).every((cmd) => !/--slack-config-token\b/.test(cmd))
      ? 'pass'
      : fail('passed --slack-config-token inline instead of the secure token path'),
};

export const sharedJudgeGraders = defineGraders({
  personaAudienceFit: labeled(
    'frames the agent for the product end-user audience in domain language',
    judge(judgePrompts.personaAudienceFit, (result) => [descriptionText(result), transcriptText(result)].join('\n'))
  ),
  noInfraMcpSemantic: labeled(
    'avoids naming internal infrastructure in the drafted agent description',
    judge(judgePrompts.noInfraMcpSemantic, (result) => descriptionText(result))
  ),
  conclusionFirstReport: labeled(
    'leads the final report with the CLI result and next action',
    judge(judgePrompts.conclusionFirstReport, (result) => result.finalText)
  ),
});
