// A stand-in for `codex app-server`, for the listener's tests. It speaks the protocol as Codex 0.165.0 was seen
// speaking it (2026-10-29): JSON-RPC without the "jsonrpc" field, one message a line; `initialize`, then
// `thread/start` or `thread/resume` (which fails with "no rollout found" for a thread it doesn't have); `turn/start`,
// which starts a turn or, while one runs, joins it and answers with that turn's id; `turn/steer`; `turn/interrupt`,
// which takes back the turn's open questions with `serverRequest/resolved`; and the approvals and questions it sends
// as requests of its own. Commands run as `/bin/zsh -lc '<script>'`.
//
// What it does depends on the words in the person's message:
//   ask:<command>        asks to run <command> and reports the decision
//   ask-twice:<command>  asks for <command> twice in one turn; an allow for the session skips the second
//   ask-in:<folder> <command>
//                        asks to run <command> in <folder>
//   network:<host>       asks to reach <host> (a network approval, without a command)
//   edit:<path>          asks to edit <path>, outside what its sandbox may write
//   permissions          asks ahead for the network, for the turn or the session
//   mcp:<tool> [conv]    asks to call the AgentInbox MCP tool <tool> on <conv>, by default the conversation it was
//                        started for; an allowed `inbox_reply` replies through the fake API
//   form                 an MCP server asks for a form to be filled, which is not an approval
//   askuser              asks the person a question with options (`request_user_input`)
//   sleep:<ms>           works for <ms> (a command that doesn't ask); messages that come meanwhile join the turn
//   reply-myself         asks to run `npx @agentinbox/cli reply <conversation> …`, then replies through the fake
//                        API, as that command would
//   wait-for:<ms>        runs `npx @agentinbox/cli reply <conversation> ask …`, which waits <ms> for the answer
//   commentary           says something along the way, then its answer
//   fail                 ends the turn as failed
//   remember             says how many messages its thread has seen
//   env                  says which parent-session variables it was started with
//   anything else        echoes it
// FAKE_CODEX_LOG names a file that gets a line per start and per thread; FAKE_CODEX_SESSIONS a folder that keeps
// threads. FAKE_CODEX_SIGNED_OUT signs it out; FAKE_CODEX_PROVIDER and FAKE_CODEX_PROVIDERS (JSON) are what its config
// says about providers, and FAKE_CODEX_DEVELOPER_INSTRUCTIONS its developer instructions; FAKE_CODEX_OLD makes it a
// Codex without `app-server`; FAKE_CODEX_SLOW_START (ms) makes it slow to answer `initialize`.
import { randomUUID } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

const argv = process.argv.slice(2);

if (argv[0] === '--version') {
  process.stdout.write('codex-cli 0.165.0\n');
  process.exit(0);
}
if (argv[0] === 'login' && argv[1] === 'status') {
  // It finds its sign-in in its home folder.
  if (process.env.FAKE_CODEX_SIGNED_OUT === '1' || !process.env.HOME) {
    process.stderr.write('Not logged in\n');
    process.exit(1);
  }
  process.stderr.write('Logged in using ChatGPT\n');
  process.exit(0);
}
if (argv[0] !== 'app-server' || process.env.FAKE_CODEX_OLD === '1') {
  process.stderr.write(`error: unrecognized subcommand '${argv[0]}'\n`);
  process.exit(2);
}

const logFile = process.env.FAKE_CODEX_LOG;
const sessionsDir = process.env.FAKE_CODEX_SESSIONS;
const apiUrl = process.env.FAKE_API_URL;
const log = (entry) => {
  if (logFile) appendFileSync(logFile, `${JSON.stringify(entry)}\n`);
};
log({ event: 'start', argv, cwd: process.cwd() });

const out = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);
const notify = (method, params) => out({ method, params, emittedAtMs: Date.now() });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Quotes a word as Codex's `shlex_join` does. */
function quote(word) {
  return /^[A-Za-z0-9@%+=:,./_-]+$/.test(word) ? word : `'${word.replace(/'/g, `'\\''`)}'`;
}

function shellCommand(script) {
  return ['/bin/zsh', '-lc', script].map(quote).join(' ');
}

let threadId = null;
let seen = 0;
const threadFile = (id) => join(sessionsDir, `${id}.json`);
const remember = (count) => {
  seen += count;
  if (sessionsDir && threadId) writeFileSync(threadFile(threadId), JSON.stringify({ messages: seen }));
};

/** The turn running: the messages it took, what was said into it, and its open questions. */
let turn = null;
let nextRequest = 0;
const answers = new Map();
/** What the operator allowed for the session. */
const granted = new Set();
let inputEnded = false;

function personText(text) {
  const blank = text.indexOf('\n\n');
  return blank >= 0 ? text.slice(blank + 2).split('\n\n')[0] : text;
}

function conversationOf(text) {
  return /conv_[A-Za-z0-9_-]+/.exec(text)?.[0];
}

async function api(method, path, body) {
  const res = await fetch(`${apiUrl}${path}`, {
    method,
    headers: { 'content-type': 'application/json', authorization: 'ApiKey fake' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

/** Sends one of its requests; its answer, or `aborted` when it is taken back on an interrupt. */
function request(method, params) {
  const id = nextRequest++;
  out({ id, method, params });
  return new Promise((resolve) => {
    answers.set(id, resolve);
    if (turn) turn.open.push(id);
  });
}

function item(type, fields) {
  return { type, id: `item_${randomUUID()}`, ...fields };
}

function started(entry) {
  notify('item/started', { item: entry, threadId, turnId: turn.id, startedAtMs: Date.now() });
}

function completed(entry) {
  notify('item/completed', { item: entry, threadId, turnId: turn.id, completedAtMs: Date.now() });
}

/** A command it runs: started, maybe asked about, then ended. */
async function command(script, { asks, interruptible, cwd = process.cwd() }) {
  const entry = item('commandExecution', {
    command: shellCommand(script),
    cwd,
    status: 'inProgress',
    commandActions: [],
  });
  started(entry);
  let decision = 'accept';
  if (asks && !granted.has(script)) {
    const answer = await interruptible(
      request('item/commandExecution/requestApproval', {
        threadId,
        turnId: turn.id,
        itemId: entry.id,
        startedAtMs: Date.now(),
        reason: 'It needs the network, which the sandbox doesn’t give.',
        command: shellCommand(script),
        cwd,
        commandActions: [],
      })
    );
    decision = answer === 'aborted' ? 'aborted' : answer.decision;
    if (decision === 'acceptForSession') granted.add(script);
  }
  completed({ ...entry, status: decision === 'accept' || decision === 'acceptForSession' ? 'completed' : 'declined' });

  return decision;
}

const allowed = (decision) => decision === 'accept' || decision === 'acceptForSession';

const BEHAVIORS = [
  [
    'ask-twice:',
    async (rest, context) => {
      const script = rest.trim();
      const once = await command(script, { asks: true, ...context });
      const asksAgain = !granted.has(script);
      const twice = allowed(once) ? await command(script, { asks: true, ...context }) : once;
      if (once === 'aborted' || twice === 'aborted') return {};

      return allowed(once) && allowed(twice)
        ? { answer: `Ran ${script} twice, ${asksAgain ? 'and asked again' : 'and was allowed for the session'}.` }
        : { answer: 'Not allowed.' };
    },
  ],
  [
    'ask:',
    async (rest, context) => {
      const script = rest.trim();
      const decision = await command(script, { asks: true, ...context });
      if (decision === 'aborted') return {};

      return { answer: allowed(decision) ? `Ran ${script} (${decision}).` : `Not allowed (${decision}).` };
    },
  ],
  [
    'ask-in:',
    async (rest, context) => {
      const [cwd, ...words] = rest.trim().split(' ');
      const script = words.join(' ');
      const decision = await command(script, { asks: true, cwd, ...context });
      if (decision === 'aborted') return {};

      return { answer: allowed(decision) ? `Ran ${script} in ${cwd} (${decision}).` : `Not allowed (${decision}).` };
    },
  ],
  [
    'network:',
    async (rest, { interruptible }) => {
      const host = rest.trim();
      const entry = item('commandExecution', { command: shellCommand(`curl https://${host}`), status: 'inProgress' });
      started(entry);
      const answer = await interruptible(
        request('item/commandExecution/requestApproval', {
          threadId,
          turnId: turn.id,
          itemId: entry.id,
          startedAtMs: Date.now(),
          networkApprovalContext: { host, protocol: 'https' },
        })
      );
      if (answer === 'aborted') return {};
      completed({ ...entry, status: allowed(answer.decision) ? 'completed' : 'declined' });

      return { answer: `Network: ${answer.decision}.` };
    },
  ],
  [
    'edit:',
    async (rest, { interruptible }) => {
      const path = rest.trim();
      const entry = item('fileChange', {
        changes: [{ path, kind: { type: 'update' }, diff: '' }],
        status: 'inProgress',
      });
      started(entry);
      const answer = await interruptible(
        request('item/fileChange/requestApproval', {
          threadId,
          turnId: turn.id,
          itemId: entry.id,
          startedAtMs: Date.now(),
          reason: 'It is outside the project.',
        })
      );
      if (answer === 'aborted') return {};
      completed({ ...entry, status: allowed(answer.decision) ? 'completed' : 'declined' });

      return { answer: `Edit: ${answer.decision}.` };
    },
  ],
  [
    'permissions',
    async (_rest, { interruptible }) => {
      const answer = await interruptible(
        request('item/permissions/requestApproval', {
          threadId,
          turnId: turn.id,
          itemId: `item_${randomUUID()}`,
          environmentId: null,
          startedAtMs: Date.now(),
          cwd: process.cwd(),
          reason: 'To install the packages.',
          permissions: { network: { enabled: true }, fileSystem: null },
        })
      );
      if (answer === 'aborted') return {};

      return {
        answer: `Permissions: ${answer.permissions?.network?.enabled ? 'network' : 'nothing'} for the ${answer.scope}.`,
      };
    },
  ],
  [
    'mcp:',
    async (rest, { interruptible, text }) => {
      const [tool, other] = rest.trim().split(/\s+/);
      const args = { conversation: other ?? conversationOf(text), message: 'I replied through MCP.' };
      const entry = item('mcpToolCall', { server: 'AgentInbox', tool, arguments: args, status: 'inProgress' });
      started(entry);
      const answer = await interruptible(
        request('mcpServer/elicitation/request', {
          threadId,
          turnId: turn.id,
          serverName: 'AgentInbox',
          mode: 'form',
          message: `Allow the AgentInbox MCP server to run tool "${tool}"?`,
          requestedSchema: { type: 'object', properties: {} },
          _meta: {
            codex_approval_kind: 'mcp_tool_call',
            persist: ['session', 'always'],
            tool_name: tool,
            tool_params: args,
          },
        })
      );
      if (answer === 'aborted') return {};
      completed({ ...entry, status: answer.action === 'accept' ? 'completed' : 'failed' });
      if (answer.action !== 'accept') return { answer: `Not allowed (${answer.action}).` };
      if (tool === 'inbox_reply') {
        await api('POST', '/v1/inbox/messages', {
          kind: 'tell',
          card: { title: args.message },
          thread: args.conversation,
        });
      }

      return { answer: `Used ${tool}${answer._meta?.persist ? ` (${answer._meta.persist})` : ''}.` };
    },
  ],
  [
    'form',
    async (_rest, { interruptible }) => {
      const answer = await interruptible(
        request('mcpServer/elicitation/request', {
          threadId,
          turnId: turn.id,
          serverName: 'github',
          mode: 'form',
          message: 'Which repository?',
          requestedSchema: { type: 'object', properties: { repo: { type: 'string' } } },
          _meta: null,
        })
      );
      if (answer === 'aborted') return {};

      return { answer: `Form: ${answer.action}.` };
    },
  ],
  [
    'askuser',
    async (_rest, { interruptible }) => {
      const answer = await interruptible(
        request('item/tool/requestUserInput', {
          threadId,
          turnId: turn.id,
          itemId: `item_${randomUUID()}`,
          questions: [
            {
              id: 'env',
              header: 'Environment',
              question: 'Which one?',
              isOther: false,
              isSecret: false,
              options: [
                { label: 'Staging', description: 'The test one.' },
                { label: 'Production', description: 'The real one.' },
              ],
            },
          ],
          isBlocking: true,
          autoResolutionMs: null,
        })
      );
      if (answer === 'aborted') return {};

      return { answer: `Answers: ${JSON.stringify(answer.answers)}` };
    },
  ],
  [
    'sleep:',
    async (rest, { interruptible }) => {
      const entry = item('commandExecution', { command: shellCommand('sleep 1'), status: 'inProgress' });
      started(entry);
      await interruptible(sleep(Number(rest)));
      completed({ ...entry, status: 'completed' });

      return { answer: 'Done sleeping.' };
    },
  ],
  [
    'reply-myself',
    async (_rest, context) => {
      const conversation = conversationOf(context.text);
      const decision = await command(`npx @agentinbox/cli reply ${conversation} "I replied myself; all good."`, {
        asks: true,
        ...context,
      });
      if (decision === 'aborted') return {};
      if (!allowed(decision)) return { answer: `Not allowed (${decision}).` };
      await api('POST', '/v1/inbox/messages', {
        kind: 'tell',
        card: { title: 'I replied myself; all good.' },
        thread: conversation,
      });

      return { answer: 'Replied in the conversation.' };
    },
  ],
  [
    'wait-for:',
    async (rest, { interruptible, text }) => {
      const entry = item('commandExecution', {
        command: shellCommand(`npx @agentinbox/cli reply ${conversationOf(text)} ask "Staging or prod?"`),
        status: 'inProgress',
      });
      started(entry);
      await interruptible(sleep(Number(rest)));
      completed({ ...entry, status: 'completed' });

      return { answer: 'Asked and got the answer.' };
    },
  ],
  [
    'commentary',
    async () => {
      const entry = item('agentMessage', { text: 'Let me look first.', phase: 'commentary' });
      started(entry);
      completed(entry);

      return { answer: 'Here is the answer.' };
    },
  ],
  ['fail', async () => ({ error: 'You have hit your usage limit.' })],
  ['remember', async () => ({ answer: `This thread has seen ${seen} messages before.` })],
  [
    'env',
    async () => {
      const marks = [
        'CLAUDECODE',
        'CLAUDE_CODE_SESSION_ID',
        'AI_AGENT',
        'CODEX_THREAD_ID',
        'CODEX_SANDBOX_NETWORK_DISABLED',
      ];
      const found = marks.filter((name) => process.env[name]);

      return { answer: `Parent marks: ${found.length ? found.join(', ') : 'none'}.` };
    },
  ],
];

async function runTurn(id, first) {
  const current = { id, messages: [first], told: [], aborted: false, abort: null, open: [] };
  turn = current;
  notify('turn/started', { threadId, turn: { id, items: [], status: 'inProgress', error: null } });

  const text = personText(first);
  const interruptible = (promise) =>
    Promise.race([
      promise,
      new Promise((resolve) => {
        current.abort = () => resolve('aborted');
      }),
    ]);
  const found = BEHAVIORS.find(([prefix]) => text.startsWith(prefix));
  const outcome = found
    ? await found[1](text.slice(found[0].length), { interruptible, text: first })
    : { answer: `Echo: ${text}` };

  let status = 'completed';
  let error = null;
  if (current.aborted) {
    status = 'interrupted';
  } else if (outcome.error) {
    status = 'failed';
    error = { message: outcome.error, codexErrorInfo: 'usageLimitExceeded', additionalDetails: null };
  } else {
    const also = current.messages.slice(1).map(personText);
    const told = current.told.length > 0 ? ` Told: ${current.told.join(' / ')}` : '';
    const answer = `${outcome.answer ?? ''}${also.length > 0 ? ` Also: ${also.join(' / ')}` : ''}${told}`;
    const message = item('agentMessage', { text: answer, phase: 'final_answer' });
    started(message);
    completed(message);
  }
  notify('turn/completed', { threadId, turn: { id, items: [], status, error } });

  remember(current.messages.length);
  turn = null;
  if (inputEnded) process.exit(0);
}

function answer(id, result) {
  out({ id, result });
}

function fail(id, message, code = -32600) {
  out({ id, error: { code, message } });
}

/** Opens a thread, or goes on with one it keeps. */
function openThread(id, method, params) {
  log({ event: 'thread', method, params });
  if (method === 'thread/resume') {
    if (sessionsDir && !existsSync(threadFile(params.threadId))) {
      fail(id, `no rollout found for thread id ${params.threadId}`);
      return;
    }
    threadId = params.threadId;
  } else {
    threadId = randomUUID();
  }
  if (sessionsDir) {
    mkdirSync(sessionsDir, { recursive: true });
    seen = existsSync(threadFile(threadId)) ? JSON.parse(readFileSync(threadFile(threadId), 'utf8')).messages : 0;
    writeFileSync(threadFile(threadId), JSON.stringify({ messages: seen }));
  }
  const thread = { id: threadId, sessionId: threadId, preview: '', ephemeral: false, status: { type: 'idle' } };
  answer(id, {
    thread,
    model: 'gpt-fake',
    modelProvider: 'openai',
    cwd: params.cwd,
    approvalPolicy: params.approvalPolicy,
  });
  notify('thread/started', { thread });
}

/** What it answers each request with, by its method. */
const METHODS = {
  initialize: (id) => {
    const reply = () =>
      answer(id, {
        userAgent: 'agentinbox/0.165.0',
        codexHome: '/tmp/codex',
        platformFamily: 'unix',
        platformOs: 'macos',
      });
    const slow = Number(process.env.FAKE_CODEX_SLOW_START || 0);
    if (slow > 0) setTimeout(reply, slow);
    else reply();
  },
  initialized: () => undefined,
  'config/read': (id) =>
    answer(id, {
      config: {
        model_provider: process.env.FAKE_CODEX_PROVIDER || null,
        model_providers: JSON.parse(process.env.FAKE_CODEX_PROVIDERS || '{}'),
        developer_instructions: process.env.FAKE_CODEX_DEVELOPER_INSTRUCTIONS || null,
        profile: null,
        profiles: {},
      },
      origins: {},
      layers: null,
    }),
  'thread/start': (id, params) => openThread(id, 'thread/start', params),
  'thread/resume': (id, params) => openThread(id, 'thread/resume', params),
  'turn/start': (id, params) => {
    const text = params.input?.[0]?.text ?? '';
    if (turn) {
      // It joins the turn running, and is read at its next step.
      turn.messages.push(text);
      answer(id, { turn: { id: turn.id, items: [], status: 'inProgress', error: null } });
      return;
    }
    const turnId = randomUUID();
    answer(id, { turn: { id: turnId, items: [], status: 'inProgress', error: null } });
    void runTurn(turnId, text);
  },
  'turn/steer': (id, params) => {
    if (!turn || turn.id !== params.expectedTurnId) {
      fail(id, 'no active turn to steer');
      return;
    }
    turn.told.push(params.input?.[0]?.text ?? '');
    answer(id, { turnId: turn.id });
  },
  'turn/interrupt': (id, params) => {
    if (turn && turn.id === params.turnId) {
      for (const requestId of turn.open) {
        if (answers.has(requestId)) {
          answers.delete(requestId);
          notify('serverRequest/resolved', { threadId, requestId });
        }
      }
      turn.aborted = true;
      turn.abort?.();
    }
    answer(id, {});
  },
};

function handle(message) {
  const { id, method, params } = message;
  if (method === undefined) {
    // An answer to one of its own requests.
    const resolve = answers.get(id);
    answers.delete(id);
    resolve?.(message.result ?? message.error);
    return;
  }

  const handler = METHODS[method];
  if (handler) {
    handler(id, params);
  } else {
    fail(id, `unknown method ${method}`, -32601);
  }
}

createInterface({ input: process.stdin })
  .on('line', (line) => {
    if (line.trim()) handle(JSON.parse(line));
  })
  .on('close', () => {
    inputEnded = true;
    if (!turn) process.exit(0);
  });
