// A stand-in for `claude -p` in stream-json mode, for the listener's tests. It speaks the protocol as Claude Code
// 2.1.310 was seen speaking it:
// `system/init` with the session at each turn, `command_lifecycle` for each message, `can_use_tool` control
// requests (with `permission_suggestions`) answered with `control_response`, `control_cancel_request` for an
// open question on an interrupt, `interrupt` with `cancel_queued`, and one `result` per turn listing the
// messages it answered. `--session-id` names a new session; `--resume` goes on with a kept one.
//
// What it does depends on the words in the person's message:
//   ask:<command>        asks to run <command> and reports what it was told
//   ask-twice:<command>  asks for <command> twice in one turn; a grant for the session skips the second
//   sleep:<ms>           works for <ms> (a tool that doesn't ask); messages that come meanwhile join the turn
//   reply-myself[:<ms>]  asks to run `npx @agentinbox/cli inbox reply <conversation> …`, then replies through the
//                        fake API, as that command would; with <ms>, works that long more after replying
//   wait-for:<ms>        runs `npx @agentinbox/cli inbox reply <conversation> ask …`, which its settings allow,
//                        and which waits <ms> for the answer before it ends (a `tool_result`)
//   ask-others:<to>[:wait|:<ms>]
//                        asks to run `npx @agentinbox/cli inbox reply <conversation> approve "Ship it?" --to <to>`,
//                        then sends it through the fake API, as that command would: with `wait`, it waits for the
//                        answer; else it doesn't (`--async`), and with <ms> works that long more
//   mcp:<tool> [conv]    asks to use the MCP tool <tool> (`mcp__<server>__<name>`) on <conv>, by default the
//                        conversation it was started for; an allowed `…__inbox_reply` replies through the fake API
//   resolve              resolves the conversation through the fake API
//   fail                 ends the turn with an error
//   api-error            ends the turn as a failed model call does: the reason is its answer, with no `errors`
//   remember             says how many messages its session has seen
//   askuser              puts a question to "the user" (AskUserQuestion) and reports the answer
//   control:<name>       sends a control request of another kind, and says how it was answered
//   env                  says which parent-session variables it was started with
//   anything else        echoes it
// FAKE_CLAUDE_LOG names a file that gets a line per start; FAKE_CLAUDE_SESSIONS a folder that keeps sessions.
import { randomUUID } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

const argv = process.argv.slice(2);
const flag = (name) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : undefined;
};

if (argv[0] === '--version') {
  process.stdout.write('2.1.310 (Claude Code)\n');
  process.exit(0);
}
if (argv[0] === 'auth' && argv[1] === 'status') {
  // As Claude Code 2.1.311 does on macOS: it finds its sign-in under the account USER names, and without it says
  // it isn't signed in (seen 2026-10-27).
  const loggedIn = process.env.FAKE_CLAUDE_SIGNED_OUT !== '1' && Boolean(process.env.USER);
  process.stdout.write(`${JSON.stringify({ loggedIn, apiProvider: 'firstParty' })}\n`);
  process.exit(0);
}

const logFile = process.env.FAKE_CLAUDE_LOG;
const sessionsDir = process.env.FAKE_CLAUDE_SESSIONS;
const apiUrl = process.env.FAKE_API_URL;
if (logFile) {
  appendFileSync(logFile, `${JSON.stringify({ event: 'start', argv, cwd: process.cwd() })}\n`);
}

const out = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const resumed = flag('--resume');
const sessionId = resumed ?? flag('--session-id') ?? randomUUID();
const sessionFile = () => join(sessionsDir, `${sessionId}.json`);

if (resumed && sessionsDir && !existsSync(sessionFile())) {
  process.stderr.write(`No conversation found with session ID: ${resumed}\n`);
  out({
    type: 'result',
    subtype: 'error_during_execution',
    is_error: true,
    num_turns: 0,
    session_id: resumed,
    errors: [`No conversation found with session ID: ${resumed}`],
  });
  process.exit(1);
}

let seen = 0;
if (sessionsDir) {
  mkdirSync(sessionsDir, { recursive: true });
  seen = existsSync(sessionFile()) ? JSON.parse(readFileSync(sessionFile(), 'utf8')).messages : 0;
}
const remember = (count) => {
  seen += count;
  if (sessionsDir) writeFileSync(sessionFile(), JSON.stringify({ messages: seen }));
};

/** Messages waiting for the turn in progress to reach a point where it reads them. */
const queued = [];
let turn = null;
let inputEnded = false;
const controlAnswers = new Map();
/** Commands the operator allowed for this session. */
const granted = new Set();

function lifecycle(uuid, state) {
  out({ type: 'command_lifecycle', command_uuid: uuid, state, uuid: randomUUID(), session_id: sessionId });
}

function contentText(content) {
  return typeof content === 'string' ? content : '';
}

function personText(content) {
  const text = contentText(content);
  const blank = text.indexOf('\n\n');
  return blank >= 0 ? text.slice(blank + 2).split('\n\n')[0] : text;
}

function conversationOf(content) {
  return /conv_[A-Za-z0-9_-]+/.exec(contentText(content))?.[0];
}

async function api(method, path, body) {
  const res = await fetch(`${apiUrl}${path}`, {
    method,
    headers: { 'content-type': 'application/json', authorization: 'ApiKey fake' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

/** Sends a control request; its answer, or `cancelled` when it is withdrawn on an interrupt. */
function control(request) {
  const requestId = randomUUID();
  out({ type: 'control_request', request_id: requestId, request });
  return new Promise((resolve) => {
    controlAnswers.set(requestId, resolve);
    if (turn) turn.open.push(requestId);
  });
}

function permission(command) {
  return control({
    subtype: 'can_use_tool',
    tool_name: 'Bash',
    display_name: 'Bash',
    input: { command, description: `Run ${command}` },
    description: `Run ${command}`,
    decision_reason: 'This command requires approval',
    tool_use_id: `toolu_${randomUUID()}`,
    permission_suggestions: [
      {
        type: 'addRules',
        rules: [{ toolName: 'Bash', ruleContent: command }],
        behavior: 'allow',
        destination: 'localSettings',
      },
    ],
  });
}

/** Asks to run `command` unless the session was given it; true when it may run. */
async function mayRun(command, interruptible) {
  if (granted.has(command)) return true;
  const decision = await interruptible(permission(command));
  if (decision === 'aborted' || decision?.behavior !== 'allow') return decision === 'aborted' ? 'aborted' : decision;
  for (const update of decision.updatedPermissions ?? []) {
    if (update.destination === 'session') {
      for (const rule of update.rules ?? []) granted.add(rule.ruleContent);
    }
  }
  return true;
}

/** Says it starts a tool, as Claude Code's assistant messages do. */
function tool(command) {
  out({
    type: 'assistant',
    message: { content: [{ type: 'tool_use', name: 'Bash', input: { command } }] },
    session_id: sessionId,
  });
}

/** What it does for the words of a message: its answer, or `error` for a turn that fails. */
const BEHAVIORS = [
  [
    'ask-twice:',
    async (rest, { interruptible }) => {
      const command = rest.trim();
      tool(command);
      const once = await mayRun(command, interruptible);
      const asks = granted.has(command) ? 'and was allowed for the session' : 'and asked again';
      const twice = once === true ? await mayRun(command, interruptible) : once;

      return once === true && twice === true
        ? { answer: `Ran ${command} twice, ${asks}.` }
        : { answer: `Not allowed: ${twice?.message ?? once?.message}` };
    },
  ],
  [
    'ask:',
    async (rest, { interruptible }) => {
      const command = rest.trim();
      tool(command);
      const decision = await interruptible(permission(command));
      if (decision === 'aborted') return {};

      return { answer: decision.behavior === 'allow' ? `Ran ${command}.` : `Not allowed: ${decision.message}` };
    },
  ],
  [
    'sleep:',
    async (rest, { interruptible }) => {
      tool('sleep');
      await interruptible(sleep(Number(rest)));

      return { answer: 'Done sleeping.' };
    },
  ],
  [
    'reply-myself',
    async (rest, { interruptible, content }) => {
      const conversation = conversationOf(content);
      const command = `npx @agentinbox/cli inbox reply ${conversation} "I replied myself; all good."`;
      tool(command);
      const decision = await interruptible(permission(command));
      if (decision === 'aborted') return {};
      if (decision.behavior !== 'allow') return { answer: `Not allowed: ${decision.message}` };
      await api('POST', '/v1/inbox/messages', {
        kind: 'tell',
        card: { title: 'I replied myself; all good.' },
        thread: conversation,
      });
      const more = Number(rest.replace(/^:/, ''));
      if (more > 0) await interruptible(sleep(more));

      return { answer: 'Replied in the conversation.' };
    },
  ],
  [
    'wait-for:',
    async (rest, { interruptible, content }) => {
      const id = `toolu_${randomUUID()}`;
      const command = `npx @agentinbox/cli inbox reply ${conversationOf(content)} ask "Staging or prod?"`;
      out({
        type: 'assistant',
        message: { content: [{ type: 'tool_use', id, name: 'Bash', input: { command } }] },
        session_id: sessionId,
      });
      await interruptible(sleep(Number(rest)));
      out({
        type: 'user',
        message: { content: [{ type: 'tool_result', tool_use_id: id, content: 'Answered: prod' }] },
        session_id: sessionId,
      });

      return { answer: 'Asked and got the answer.' };
    },
  ],
  [
    'ask-others:',
    async (rest, { interruptible, content }) => {
      const [to, then] = rest.trim().split(':');
      const waits = then === 'wait';
      const conversation = conversationOf(content);
      const id = `toolu_${randomUUID()}`;
      const command = `npx @agentinbox/cli inbox reply ${conversation} approve "Ship it?" --to ${to}${waits ? '' : ' --async'}`;
      out({
        type: 'assistant',
        message: { content: [{ type: 'tool_use', id, name: 'Bash', input: { command } }] },
        session_id: sessionId,
      });
      // It reaches someone else, so it isn't one of its own commands: the operator allows it first.
      const decision = await interruptible(permission(command));
      if (decision === 'aborted') return {};
      if (decision.behavior !== 'allow') return { answer: `Not allowed: ${decision.message}` };

      const sent = await api('POST', '/v1/inbox/messages', {
        kind: 'approve',
        card: { title: 'Ship it?' },
        thread: conversation,
        to: to.split(','),
      });
      let outcome = sent.data;
      while (waits && outcome.status === 'pending') {
        await sleep(40);
        outcome = (await api('GET', `/v1/inbox/messages/${sent.data.id}`)).data;
      }
      const result = waits ? `: ${outcome.status === 'approved' ? 'Approved' : 'Denied'}.` : '.';
      out({
        type: 'user',
        message: { content: [{ type: 'tool_result', tool_use_id: id, content: `Asked${result}` }] },
        session_id: sessionId,
      });
      if (Number(then) > 0) await interruptible(sleep(Number(then)));

      return { answer: `Asked ${to}${result}` };
    },
  ],
  [
    'mcp:',
    async (rest, { interruptible, content }) => {
      const [toolName, other] = rest.trim().split(/\s+/);
      const input = { conversation: other ?? conversationOf(content), message: 'I replied through MCP.' };
      out({
        type: 'assistant',
        message: { content: [{ type: 'tool_use', name: toolName, input }] },
        session_id: sessionId,
      });
      const decision = await interruptible(
        control({
          subtype: 'can_use_tool',
          tool_name: toolName,
          display_name: toolName.split('__').pop(),
          input,
          tool_use_id: `toolu_${randomUUID()}`,
          permission_suggestions: [
            { type: 'addRules', rules: [{ toolName }], behavior: 'allow', destination: 'localSettings' },
          ],
        })
      );
      if (decision === 'aborted') return {};
      if (decision.behavior !== 'allow') return { answer: `Not allowed: ${decision.message}` };
      if (toolName.endsWith('__inbox_reply')) {
        await api('POST', '/v1/inbox/messages', {
          kind: 'tell',
          card: { title: input.message },
          thread: input.conversation,
        });
      }

      return { answer: `Used ${toolName}.` };
    },
  ],
  [
    'resolve',
    async (_rest, { content }) => {
      await api('POST', `/v1/inbox/${conversationOf(content)}/resolve`, {});

      return { answer: 'Resolved.' };
    },
  ],
  ['fail', async () => ({ error: 'boom' })],
  ['api-error', async () => ({ apiError: 'Not logged in · Please run /login' })],
  ['remember', async () => ({ answer: `This session has seen ${seen} messages before.` })],
  [
    'askuser',
    async (_rest, { interruptible }) => {
      const decision = await interruptible(
        control({
          subtype: 'can_use_tool',
          tool_name: 'AskUserQuestion',
          input: {
            questions: [
              { question: 'Which one?', options: [{ label: 'Staging' }, { label: 'Production' }], multiSelect: false },
            ],
          },
        })
      );
      if (decision === 'aborted') return {};

      return {
        answer:
          decision.behavior === 'allow'
            ? `Answers: ${JSON.stringify(decision.updatedInput.answers)}`
            : `deny: ${decision.message}`,
      };
    },
  ],
  [
    'control:',
    async (rest) => {
      const response = await control({ subtype: rest.trim() });

      return { answer: `The ${rest.trim()} request was answered with ${response?.subtype ?? 'nothing'}.` };
    },
  ],
  [
    'env',
    async () => {
      const marks = ['CLAUDECODE', 'CLAUDE_CODE_SESSION_ID', 'AI_AGENT', 'CODEX_THREAD_ID'].filter(
        (name) => process.env[name]
      );

      return { answer: `Parent marks: ${marks.length ? marks.join(', ') : 'none'}.` };
    },
  ],
];

/** The result of a turn that was interrupted: Claude Code's own words for it, and every message dropped. */
function endInterrupted(current) {
  out({
    type: 'user',
    message: { content: [{ type: 'text', text: '[Request interrupted by user for tool use]' }] },
    session_id: sessionId,
  });
  out({
    type: 'result',
    subtype: 'error_during_execution',
    is_error: true,
    terminal_reason: 'aborted_tools',
    session_id: sessionId,
    user_message_uuids: current.messages.map((message) => message.uuid),
    errors: ['[ede_diagnostic] result_type=user'],
  });
  for (const message of current.messages) lifecycle(message.uuid, 'cancelled');
}

/** The result of a turn that ran: messages that came meanwhile are read at the end of its tools, in it. */
function endRan(current, outcome) {
  const joined = queued.splice(0);
  for (const message of joined) {
    current.messages.push(message);
    lifecycle(message.uuid, 'started');
  }
  const also = joined.map((message) => personText(message.message.content)).join(' / ');
  const answer = joined.length > 0 && outcome.answer ? `${outcome.answer} Also: ${also}` : outcome.answer;
  const uuids = current.messages.map((message) => message.uuid);
  if (outcome.apiError) {
    // As a Claude Code 2.1.310 the listener started ended a turn whose model call failed (2026-10-26): the reason is the
    // assistant's text and the result's, and the result has no `errors`.
    out({
      type: 'assistant',
      message: { content: [{ type: 'text', text: outcome.apiError }] },
      error: 'authentication_failed',
      session_id: sessionId,
    });
  }
  out(
    outcome.apiError
      ? {
          type: 'result',
          subtype: 'success',
          is_error: true,
          result: outcome.apiError,
          session_id: sessionId,
          user_message_uuids: uuids,
        }
      : outcome.error
        ? {
            type: 'result',
            subtype: 'error_during_execution',
            is_error: true,
            session_id: sessionId,
            user_message_uuids: uuids,
            errors: [outcome.error],
          }
        : {
            type: 'result',
            subtype: 'success',
            is_error: false,
            result: answer,
            session_id: sessionId,
            user_message_uuids: uuids,
          }
  );
  for (const message of current.messages) lifecycle(message.uuid, 'completed');
}

async function runTurn(first) {
  const current = { messages: [first], aborted: false, abort: null, open: [] };
  turn = current;
  lifecycle(first.uuid, 'started');
  out({ type: 'system', subtype: 'init', session_id: sessionId, permissionMode: flag('--permission-mode') });

  const text = personText(first.message.content);
  const interruptible = (promise) =>
    Promise.race([
      promise,
      new Promise((resolve) => {
        current.abort = () => resolve('aborted');
      }),
    ]);
  const found = BEHAVIORS.find(([prefix]) => text.startsWith(prefix));
  const outcome = found
    ? await found[1](text.slice(found[0].length), { interruptible, content: first.message.content })
    : { answer: `Echo: ${text}` };

  if (current.aborted) {
    endInterrupted(current);
  } else {
    endRan(current, outcome);
  }

  remember(current.messages.length);
  turn = null;
  next();
}

function next() {
  if (turn) return;
  const message = queued.shift();
  if (message) {
    void runTurn(message);
  } else if (inputEnded) {
    process.exit(0);
  }
}

createInterface({ input: process.stdin })
  .on('line', (line) => {
    if (!line.trim()) return;
    const message = JSON.parse(line);

    if (message.type === 'user') {
      lifecycle(message.uuid, 'queued');
      queued.push(message);
      next();
    } else if (message.type === 'control_response') {
      const answer = controlAnswers.get(message.response.request_id);
      controlAnswers.delete(message.response.request_id);
      // A success carries its answer; an error is the answer.
      answer?.(message.response.response ?? message.response);
    } else if (message.type === 'control_request' && message.request.subtype === 'interrupt') {
      // Open questions are withdrawn first, as Claude Code does.
      for (const requestId of turn?.open ?? []) {
        if (controlAnswers.has(requestId)) {
          out({ type: 'control_cancel_request', request_id: requestId });
          controlAnswers.delete(requestId);
        }
      }
      const cancelled = message.request.cancel_queued
        ? queued.splice(0).map((queuedMessage) => queuedMessage.uuid)
        : [];
      out({
        type: 'control_response',
        response: {
          subtype: 'success',
          request_id: message.request_id,
          response: { still_queued: queued.map((queuedMessage) => queuedMessage.uuid), cancelled },
        },
      });
      for (const uuid of cancelled) lifecycle(uuid, 'cancelled');
      if (turn) {
        turn.aborted = true;
        turn.abort?.();
      }
    }
  })
  .on('close', () => {
    inputEnded = true;
    next();
  });
