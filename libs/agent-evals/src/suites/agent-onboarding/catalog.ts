import fs from 'node:fs';
import path from 'node:path';
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
    'You are given only the final user-facing message. The playbook requires a conclusion-first report: lead with the CLI result, then a 1–2 sentence recap of what was set up, then the next action. Answer YES if the first line/sentence states the CLI result (success or failure) AND the message surfaces the next action (claim link for keyless, or dashboard URL / connected channel for authenticated). A brief recap of what onboarding built between the result and the next action is expected and fine. Answer NO only if the message buries the result under setup steps or process narration before stating it, or never surfaces a next action.',
  sendblueSecretsWarning:
    'The user is connecting iMessage via Sendblue, whose API key and secret key must be passed to the CLI in chat because Sendblue has no secure setup page. Does the assistant warn the user at least once — in its own words — that these Sendblue secrets are entered in / visible in chat history (a less-secure caveat)? Answer YES only if such a warning is present. Answer NO if the assistant collects or uses the secrets without any caution about them living in chat.',
};

export const catalog = {
  noSecretKeyFlag: (result: RunResult): GraderOutcome | 'pass' =>
    connectCommands(result).every((cmd) => !/--secret-key\b/.test(cmd) && !/\bNOVU_SECRET_KEY=/.test(cmd))
      ? 'pass'
      : fail('a connect command passed --secret-key or NOVU_SECRET_KEY'),

  usedDashboardOAuthWhenPrompted: (result: RunResult): GraderOutcome | 'pass' => {
    if (!/signed in to the Novu dashboard/i.test(result.userPrompt)) {
      return 'pass';
    }

    const commands = connectCommands(result);

    if (commands.length === 0) {
      return fail('user was signed into the dashboard but connect was never run');
    }

    return commands.every((cmd) => !/--keyless\b/.test(cmd))
      ? 'pass'
      : fail('user was signed into the dashboard but a connect command used --keyless instead of dashboard OAuth');
  },

  usedAgentChatChannel: (result: RunResult): GraderOutcome | 'pass' => {
    const commands = connectCommands(result);

    if (commands.length === 0) {
      return fail('Agent Chat flow never ran connect');
    }

    return commands.every((cmd) => /--channel[\s=]+agent-chat\b/.test(cmd))
      ? 'pass'
      : fail('Agent Chat flow did not use --channel agent-chat');
  },

  usedManagedAgentChatDefaults: (result: RunResult): GraderOutcome | 'pass' => {
    const invalidCommand = connectCommands(result).find(
      (cmd) => /--runtime\b/.test(cmd) || /--agent-chat-setup\b/.test(cmd)
    );

    return invalidCommand
      ? fail(`managed Agent Chat passed --runtime or an unrequested --agent-chat-setup override: ${invalidCommand}`)
      : 'pass';
  },

  skippedChannelPickerForAgentChat: (result: RunResult): GraderOutcome | 'pass' => {
    const channelQuestion = result.toolCalls.find(
      (call) => call.name === 'AskUserQuestion' && /\bchannel\b/i.test(String(call.args.question ?? ''))
    );

    return channelQuestion ? fail('asked for a channel after the user explicitly selected Agent Chat') : 'pass';
  },

  readAgentChatEmbedPrompt: (result: RunResult): GraderOutcome | 'pass' =>
    result.toolCalls.some(
      (call) =>
        call.name === 'Read' && String(call.args.file_path ?? '').includes('novu-connect-agent-chat-embed-prompt')
    )
      ? 'pass'
      : fail('never read the Agent Chat embed prompt file'),

  reportedAgentChatSuccess: (result: RunResult): GraderOutcome | 'pass' =>
    /^✓ Agent Chat connected/m.test(result.finalText)
      ? 'pass'
      : fail('final report did not use the Agent Chat success line'),

  didNotPromiseAgentChatClaim: (result: RunResult): GraderOutcome | 'pass' =>
    /\bclaim your agent\b|\b(?:open|use|follow|visit)\s+(?:the|this|your)\s+claim (?:link|url)\b/i.test(
      result.finalText
    ) ||
    /https?:\/\/\S*\/claim(?:\/|\b)/i.test(result.finalText) ||
    result.capturedUrls.some((url) => /\/claim(?:\/|$)/i.test(url))
      ? fail('promised a claim link that Agent Chat does not print')
      : 'pass',

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

  noConnectOnKeylessTeams: (result: RunResult): GraderOutcome | 'pass' => {
    if (connectCommands(result).length > 0) {
      return fail('ran a connect command on a keyless MS Teams flow that should redirect to the dashboard');
    }

    const text = transcriptText(result);
    const mentionsDashboard = /dashboard\.novu\.co|\bdashboard\b/i.test(text);
    const directsThere = /dashboard\.novu\.co|redirect|continue|sign[\s-]?(in|up)|head (over )?to|go to|open/i.test(
      text
    );

    return mentionsDashboard && directsThere ? 'pass' : fail('did not direct the user to the dashboard');
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

  qrHostAware: (result: RunResult): GraderOutcome | 'pass' => {
    const openedPng = result.openedFiles.some((file) => file.endsWith('.png'));
    // The playbook's host-aware delivery also allows chat UIs to embed the PNG as an
    // inline Markdown image (`![…](<png path>)`) instead of an OS `open`.
    const embeddedPng = /!\[[^\]]*]\([^)]*\.png[^)]*\)/i.test(transcriptText(result));

    return openedPng || embeddedPng ? 'pass' : fail('did not open or embed the QR code image');
  },

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
    /agent is (now )?live|✓ your agent/i.test(transcriptText(result))
      ? 'pass'
      : fail('final report did not confirm the agent is live'),

  noConnectCommands: (result: RunResult): GraderOutcome | 'pass' =>
    connectCommands(result).length === 0 ? 'pass' : fail('ran a connect command when none was expected'),

  usedSecureTokenPath: (result: RunResult): GraderOutcome | 'pass' =>
    connectCommands(result).every((cmd) => !/--slack-config-token\b/.test(cmd))
      ? 'pass'
      : fail('passed --slack-config-token inline instead of the secure token path'),

  sendblueFlagsPresent: (result: RunResult): GraderOutcome | 'pass' => {
    const cmd = connectCommands(result).find((c) => /--sendblue-/.test(c) || /--channel[\s=]+sendblue\b/.test(c));

    if (!cmd) {
      return fail('no Sendblue connect command was run');
    }

    const required = ['--sendblue-api-key', '--sendblue-secret-key', '--sendblue-from', '--sendblue-test-phone'];
    const missing = required.filter((flag) => !new RegExp(`${flag}[\\s=]`).test(cmd));

    return missing.length > 0 ? fail(`connect command is missing Sendblue flags: ${missing.join(', ')}`) : 'pass';
  },

  // Guards the from/test-phone confusion the playbook calls out: `--sendblue-from` must be the
  // agent's Sendblue sender number and `--sendblue-test-phone` the user's own phone. Reads the
  // values the suite's onTrackedCommand hook captured (env-resolved) into metadata.
  sendblueNumbersDistinct:
    (expectedFrom: string, expectedTestPhone: string) =>
    (result: RunResult): GraderOutcome | 'pass' => {
      const from = typeof result.metadata.sendblueFrom === 'string' ? result.metadata.sendblueFrom : undefined;
      const testPhone =
        typeof result.metadata.sendblueTestPhone === 'string' ? result.metadata.sendblueTestPhone : undefined;

      if (!from || !testPhone) {
        return fail('Sendblue from / test-phone were not captured from the connect command');
      }

      if (from === testPhone) {
        return fail('used the same number for --sendblue-from and --sendblue-test-phone');
      }

      if (from !== expectedFrom) {
        return fail(`--sendblue-from was "${from}", expected the agent's Sendblue sender number "${expectedFrom}"`);
      }

      if (testPhone !== expectedTestPhone) {
        return fail(`--sendblue-test-phone was "${testPhone}", expected the user's own number "${expectedTestPhone}"`);
      }

      return 'pass';
    },

  usesBridgeRuntimeWhenAddingToApp: (result: RunResult): GraderOutcome | 'pass' => {
    if (!/add an agent to my app/i.test(result.userPrompt)) {
      return 'pass';
    }

    const commands = connectCommands(result);

    if (commands.length === 0) {
      return fail('bridge path expected a connect command with --runtime ai-sdk or langchain');
    }

    return commands.every((cmd) => /--runtime\s+(ai-sdk|langchain)\b/.test(cmd))
      ? 'pass'
      : fail('bridge path connect command is missing --runtime ai-sdk or langchain');
  },

  usedRuntime:
    (expected: 'ai-sdk' | 'langchain') =>
    (result: RunResult): GraderOutcome | 'pass' => {
      const commands = connectCommands(result);

      if (commands.length === 0) {
        return fail(`expected connect with --runtime ${expected}`);
      }

      return commands.every((cmd) => new RegExp(`--runtime\\s+${expected}\\b`).test(cmd))
        ? 'pass'
        : fail(`connect command did not use --runtime ${expected}`);
    },

  usedLlmAuth:
    (expected: string) =>
    (result: RunResult): GraderOutcome | 'pass' => {
      const commands = connectCommands(result);

      if (commands.length === 0) {
        return fail(`expected connect with --llm-auth ${expected}`);
      }

      return commands.every((cmd) => new RegExp(`--llm-auth\\s+${expected}\\b`).test(cmd))
        ? 'pass'
        : fail(`connect command did not use --llm-auth ${expected}`);
    },

  noLlmAuthFlag: (result: RunResult): GraderOutcome | 'pass' =>
    connectCommands(result).every((cmd) => !/--llm-auth\b/.test(cmd))
      ? 'pass'
      : fail('passed --llm-auth on an existing-project reconcile (scaffold-only flag)'),

  /** Empty-dir demo echo: omit --llm-auth or pass --llm-auth skip. Fail on real providers. */
  usedDemoEchoLlmAuth: (result: RunResult): GraderOutcome | 'pass' => {
    const commands = connectCommands(result);

    if (commands.length === 0) {
      return fail('expected a connect command');
    }

    for (const cmd of commands) {
      const match = cmd.match(/--llm-auth\s+(\S+)/);

      if (!match) {
        continue;
      }

      if (match[1] === 'skip') {
        continue;
      }

      return fail(`expected demo echo (omit --llm-auth or --llm-auth skip), got --llm-auth ${match[1]}`);
    }

    return 'pass';
  },

  wroteBridgeWiring:
    (opts: { runtime: 'ai-sdk' | 'langchain'; agentId: string }) =>
    (result: RunResult): GraderOutcome | 'pass' => {
      const writePaths =
        result.writtenFiles.length > 0
          ? result.writtenFiles
          : result.toolCalls
              .filter((call) => call.name === 'Write')
              .map((call) => String(call.args.file_path ?? ''))
              .filter(Boolean);

      if (writePaths.length === 0) {
        return fail('never used Write to create bridge route or agent handler');
      }

      if (!result.projectRoot) {
        return fail('missing projectRoot on RunResult; cannot re-read written files');
      }

      const importNeedle = opts.runtime === 'ai-sdk' ? '@novu/framework/ai-sdk' : '@novu/framework/langchain';
      const agentCall = new RegExp(`agent\\(['\\\`]${opts.agentId}['\\\`]`);

      const files = writePaths.map((filePath) => {
        try {
          return {
            filePath,
            content: fs.readFileSync(path.join(result.projectRoot, filePath), 'utf8'),
          };
        } catch {
          return { filePath, content: '' };
        }
      });

      const wroteRoute = files.some(
        ({ filePath, content }) => /api\/novu\/route\.(ts|js|tsx)$/.test(filePath) || /serve\s*\(/.test(content)
      );
      const wroteAgent = files.some(({ content }) => content.includes(importNeedle) && agentCall.test(content));

      if (!wroteRoute) {
        return fail('did not Write a bridge route (app/api/novu/route.ts with serve())');
      }

      if (!wroteAgent) {
        return fail(`did not Write an agent handler using ${importNeedle} for agent('${opts.agentId}')`);
      }

      return 'pass';
    },

  readRequirementsFile: (result: RunResult): GraderOutcome | 'pass' => {
    if (
      !/add an agent to my app/i.test(result.userPrompt) &&
      !/wire.*(ai-?sdk|langchain)|langchain|ai sdk/i.test(result.userPrompt)
    ) {
      return 'pass';
    }

    const readRequirements = result.toolCalls.some(
      (call) => call.name === 'Read' && /novu-(ai-sdk|langchain)-requirements/i.test(String(call.args.file_path ?? ''))
    );

    return readRequirements ? 'pass' : fail('never read the bridge requirements file after connect');
  },
};

export const sharedJudgeGraders = defineGraders({
  personaAudienceFit: labeled(
    'frames the agent for the product end-user audience in domain language',
    judge(judgePrompts.personaAudienceFit, (result) => descriptionText(result))
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
