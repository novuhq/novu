import { defineGraders, judge, toolCallsNamed, transcriptText } from '../../core/graders.js';
import type { RunResult } from '../../core/types.js';

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
    'Does the final user-facing message lead with the CLI result (success or failure), then give the one next action (claim link for keyless or dashboard for authenticated), kept terse?',
};

export const catalog = {
  noSecretKeyFlag: (result: RunResult) =>
    connectCommands(result).every((cmd) => !/--secret-key\b/.test(cmd) && !/\bNOVU_SECRET_KEY=/.test(cmd))
      ? 'pass'
      : 'fail',

  usedLoginWhenDashboardPrompt: (result: RunResult) => {
    if (!/signed in to the Novu dashboard/i.test(result.userPrompt)) {
      return 'pass';
    }

    return connectCommands(result).some((cmd) => /--login\b/.test(cmd)) ? 'pass' : 'fail';
  },

  backgroundConnectShell: (result: RunResult) => {
    const connectCall = firstConnectCall(result);

    if (!connectCall) {
      return 'fail';
    }

    return Boolean(connectCall.args.run_in_background) && result.polledShellIds.length > 0 ? 'pass' : 'fail';
  },

  noTimersNoWatchers: (result: RunResult) => {
    const forbidden = result.toolCalls.some((call) => {
      if (call.name !== 'Bash') {
        return false;
      }

      const command = String(call.args.command ?? '').toLowerCase();

      return /\bsleep\b/.test(command) || /\btail\b/.test(command) || /\bgrep\b/.test(command);
    });

    const readLogs = result.toolCalls.some((call) => {
      if (call.name !== 'Read') {
        return false;
      }

      const filePath = String(call.args.file_path ?? '');

      return filePath.includes('/tmp/') || filePath.endsWith('.log');
    });

    return forbidden || readLogs ? 'fail' : 'pass';
  },

  usedPickerForDecisions: (result: RunResult) =>
    toolCallsNamed(result, 'AskUserQuestion').length >= 1 ? 'pass' : 'fail',

  pastedLiteralUrl:
    (expectedUrl: string) =>
    (result: RunResult): 'pass' | 'fail' =>
      result.capturedUrls.includes(expectedUrl) || transcriptText(result).includes(expectedUrl) ? 'pass' : 'fail',

  descriptionExcludesInfraTokens:
    (tokens: string[]) =>
    (result: RunResult): 'pass' | 'fail' => {
      const description = descriptionText(result).toLowerCase();

      return tokens.some((token) => description.includes(token.toLowerCase())) ? 'fail' : 'pass';
    },

  descriptionIncludesTokens:
    (tokens: string[]) =>
    (result: RunResult): 'pass' | 'fail' => {
      const description = descriptionText(result).toLowerCase();

      return tokens.some((token) => description.includes(token.toLowerCase())) ? 'pass' : 'fail';
    },

  noConnectOnKeylessWhatsapp: (result: RunResult) =>
    connectCommands(result).length === 0 &&
    /dashboard\.novu\.co|dashboard redirect|continue.*dashboard/i.test(transcriptText(result))
      ? 'pass'
      : 'fail',

  confirmedBeforeRun: (result: RunResult) => {
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

    return approveIndex !== -1 && approveIndex < firstConnectIndex ? 'pass' : 'fail';
  },

  qrHostAware: (result: RunResult) => (result.openedFiles.some((file) => file.endsWith('.png')) ? 'pass' : 'fail'),

  reranWithSlackToken: (result: RunResult) =>
    connectCommands(result).some((cmd) => /--slack-config-token\b/.test(cmd)) ? 'pass' : 'fail',

  killedFirstConnectShell: (result: RunResult) => (result.killedShellIds.length >= 1 ? 'pass' : 'fail'),

  readAuthUrlFile: (result: RunResult) =>
    result.toolCalls.some(
      (call) => call.name === 'Read' && String(call.args.file_path ?? '').includes('novu-connect-auth-url')
    ) ||
    result.capturedUrls.some((url) => url.includes('/oauth/device')) ||
    transcriptText(result).includes('/oauth/device')
      ? 'pass'
      : 'fail',

  reportedSuccess: (result: RunResult) =>
    /your agent is live|agent is live/i.test(transcriptText(result)) ? 'pass' : 'fail',

  noConnectCommands: (result: RunResult) => (connectCommands(result).length === 0 ? 'pass' : 'fail'),

  usedSecureTokenPath: (result: RunResult) =>
    connectCommands(result).every((cmd) => !/--slack-config-token\b/.test(cmd)) ? 'pass' : 'fail',
};

export const sharedJudgeGraders = defineGraders({
  personaAudienceFit: judge(judgePrompts.personaAudienceFit, (result) =>
    [descriptionText(result), transcriptText(result)].join('\n')
  ),
  noInfraMcpSemantic: judge(judgePrompts.noInfraMcpSemantic, (result) => descriptionText(result)),
  conclusionFirstReport: judge(judgePrompts.conclusionFirstReport, (result) => transcriptText(result)),
});
