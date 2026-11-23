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
//   call:<server>.<tool> calls an MCP server's tool, which asks nothing
// A contact's thread (one opened with `untrusted` approvals) runs the hook it was started with (`-c hooks.PreToolUse`,
// trusted by `-c hooks.state`) before each command and tool call, and goes by the folder's rules as Codex does: an
// `allow` rule runs without asking, `forbidden` refuses, and anything else asks. The folder is `.codex` in the folder
// it runs in, its settings the JSON in `.codex/fake-config.json` (Codex reads `config.toml`) and its rules
// `.codex/rules/*.rules`, read as lines of `prefix_rule(pattern = [...], decision = "...")`; FAKE_CODEX_UNTRUSTED
// leaves it unloaded. Its skills are `.agents/skills/*/SKILL.md`; FAKE_CODEX_USER_SKILLS (JSON) lists the operator's,
// FAKE_CODEX_MCP_SERVERS (JSON) the operator's MCP servers and FAKE_CODEX_USER_HOOK=1 adds a hook of theirs.
// FAKE_CODEX_HOOKS_UNTRUSTED=1 never trusts the hook. `execpolicy check --rules <file>… -- <words>` checks words.
// FAKE_CODEX_LOG names a file that gets a line per start and per thread; FAKE_CODEX_SESSIONS a folder that keeps
// threads. FAKE_CODEX_SIGNED_OUT signs it out; FAKE_CODEX_PROVIDER and FAKE_CODEX_PROVIDERS (JSON) are what its config
// says about providers, and FAKE_CODEX_DEVELOPER_INSTRUCTIONS its developer instructions; FAKE_CODEX_OLD makes it a
// Codex without `app-server`; FAKE_CODEX_SLOW_START (ms) makes it slow to answer `initialize`.
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

const argv = process.argv.slice(2);

/** The folder's rules, from `prefix_rule(...)` lines: each one's words and decision. */
function rulesFrom(files) {
  return files.flatMap((file) =>
    readFileSync(file, 'utf8')
      .split('\n')
      .flatMap((line) => {
        const found = /prefix_rule\(\s*pattern\s*=\s*(\[[^\]]*\])\s*,\s*decision\s*=\s*"(\w+)"/.exec(line);
        return found ? [{ pattern: JSON.parse(found[1]), decision: found[2] }] : [];
      })
  );
}

/** What the rules say about a command's words, as `codex execpolicy check` prints it: the strictest one wins. */
function checkWords(rules, words) {
  const matched = rules.filter((rule) => rule.pattern.every((word, index) => words[index] === word));
  const order = ['allow', 'prompt', 'forbidden'];
  const decision = matched.map((rule) => rule.decision).sort((a, b) => order.indexOf(b) - order.indexOf(a))[0];
  return {
    matchedRules: matched.map((rule) => ({
      prefixRuleMatch: { matchedPrefix: rule.pattern, decision: rule.decision },
    })),
    ...(decision ? { decision } : {}),
  };
}

if (argv[0] === 'execpolicy' && argv[1] === 'check') {
  const files = [];
  let at = 2;
  for (; at < argv.length && argv[at] !== '--'; at++) {
    if (argv[at] === '--rules') files.push(argv[++at]);
  }
  process.stdout.write(`${JSON.stringify(checkWords(rulesFrom(files), argv.slice(at + 1)))}\n`);
  process.exit(0);
}

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
/** What it was started with: the listener's hook, and the hooks' states (`-c` flags). */
const flags = argv.slice(1).flatMap((word, index, all) => (all[index - 1] === '-c' ? [word] : []));
const hookCommand = flags
  .map((flag) => /^hooks\.PreToolUse=.*command=("(?:[^"\\]|\\.)*")/.exec(flag)?.[1])
  .filter(Boolean)
  .map((quoted) => JSON.parse(quoted))[0];
const hookStates = flags.find((flag) => flag.startsWith('hooks.state=')) ?? '';
const HOOK_KEY = '/<session-flags>/config.toml:pre_tool_use:0:0';
const USER_HOOK_KEY = '/fake-home/.codex/config.toml:permission_request:0:0';
const hookHash = hookCommand ? `sha256:${createHash('sha256').update(hookCommand).digest('hex')}` : undefined;
const hookTrusted =
  Boolean(hookCommand) &&
  process.env.FAKE_CODEX_HOOKS_UNTRUSTED !== '1' &&
  hookStates.includes(`trusted_hash="${hookHash}"`);
const folderGiven = process.env.AGENTINBOX_CODEX_FOLDER ? JSON.parse(process.env.AGENTINBOX_CODEX_FOLDER) : undefined;
log({ event: 'start', argv, cwd: process.cwd(), folder: folderGiven?.folder });

/** The folder's `.codex`, when it loads: its settings and its rules. */
function projectLayer() {
  const dotCodex = join(process.cwd(), '.codex');
  if (!existsSync(dotCodex)) return undefined;
  const settings = join(dotCodex, 'fake-config.json');
  const rulesDir = join(dotCodex, 'rules');
  return {
    dotCodex,
    config: existsSync(settings) ? JSON.parse(readFileSync(settings, 'utf8')) : {},
    rules: existsSync(rulesDir)
      ? readdirSync(rulesDir)
          .filter((name) => name.endsWith('.rules'))
          .map((name) => join(rulesDir, name))
      : [],
    disabledReason: process.env.FAKE_CODEX_UNTRUSTED === '1' ? 'Trust the project to load it.' : null,
  };
}

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

/** Whether the thread is a contact's: one opened with `untrusted` approvals. */
let contactThread = false;
/** Why the hook refused the last call it refused. */
let blockedFor = '';

/** Runs the listener's hook for a call of a contact's thread: the reason when it refuses, or undefined. */
function runHook(toolName, toolInput, cwd) {
  if (!contactThread || !hookTrusted) return undefined;
  const ran = spawnSync('/bin/sh', ['-c', hookCommand], {
    input: JSON.stringify({
      session_id: threadId,
      turn_id: turn?.id,
      cwd,
      hook_event_name: 'PreToolUse',
      tool_name: toolName,
      tool_input: toolInput,
    }),
    encoding: 'utf8',
    env: process.env,
  });
  const said = ran.stdout.trim() ? JSON.parse(ran.stdout) : {};
  const reason =
    ran.status === 2
      ? ran.stderr.trim()
      : said.hookSpecificOutput?.permissionDecision === 'deny'
        ? said.hookSpecificOutput.permissionDecisionReason
        : undefined;
  notify('hook/completed', {
    threadId,
    turnId: turn?.id,
    run: {
      id: randomUUID(),
      eventName: 'preToolUse',
      status: reason ? 'blocked' : 'completed',
      entries: reason ? [{ kind: 'feedback', text: reason }] : [],
    },
  });
  return reason;
}

/** What the folder's rules say about a command of a contact's thread, as Codex goes by them. */
function ruleFor(script) {
  const layer = projectLayer();
  if (!contactThread || !layer || layer.disabledReason) return undefined;
  return checkWords(rulesFrom(layer.rules), script.split(/\s+/)).decision;
}

/** A command it runs: started, maybe asked about, then ended. */
async function command(script, { asks: asked, interruptible, cwd = process.cwd() }) {
  const blocked = runHook('Bash', { command: script }, cwd);
  if (blocked) {
    blockedFor = blocked;
    return 'blocked';
  }
  const rule = ruleFor(script);
  if (rule === 'forbidden') return 'forbidden';
  // A contact's thread asks before anything a rule doesn't allow.
  const asks = contactThread ? rule !== 'allow' : asked;
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
      if (decision === 'blocked') return { answer: `Blocked: ${blockedFor}` };

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
    'call:',
    async (rest) => {
      const [server, tool] = rest.trim().split('.');
      const blocked = runHook(`mcp__${server}__${tool}`, {}, process.cwd());
      if (blocked) return { answer: `Blocked: ${blocked}` };
      const entry = item('mcpToolCall', { server, tool, arguments: {}, status: 'inProgress' });
      started(entry);
      completed({ ...entry, status: 'completed' });

      return { answer: `Called ${tool} of ${server}.` };
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
  contactThread = params.approvalPolicy === 'untrusted';
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
  'config/read': (id, params) => {
    const layer = projectLayer();
    const own = layer && !layer.disabledReason ? layer.config : {};
    answer(id, {
      config: {
        model_provider: process.env.FAKE_CODEX_PROVIDER || null,
        model_providers: JSON.parse(process.env.FAKE_CODEX_PROVIDERS || '{}'),
        developer_instructions: own.developer_instructions ?? process.env.FAKE_CODEX_DEVELOPER_INSTRUCTIONS ?? null,
        profile: null,
        profiles: {},
        mcp_servers: { ...JSON.parse(process.env.FAKE_CODEX_MCP_SERVERS || '{}'), ...(own.mcp_servers ?? {}) },
      },
      origins: {},
      layers: params?.includeLayers
        ? [
            ...(layer
              ? [
                  {
                    name: { type: 'project', dotCodexFolder: layer.dotCodex },
                    version: 'sha256:fake',
                    config: layer.config,
                    disabledReason: layer.disabledReason,
                  },
                ]
              : []),
            { name: { type: 'user', file: '/fake-home/.codex/config.toml' }, version: 'sha256:fake', config: {} },
          ]
        : null,
    });
  },
  'skills/list': (id) => {
    const folder = join(process.cwd(), '.agents', 'skills');
    const repo = existsSync(folder)
      ? readdirSync(folder)
          .filter((name) => existsSync(join(folder, name, 'SKILL.md')))
          .map((name) => ({ name, path: join(folder, name, 'SKILL.md'), scope: 'repo', enabled: true }))
      : [];
    const user = JSON.parse(process.env.FAKE_CODEX_USER_SKILLS || '[]').map((path) => ({
      name: path.split('/').at(-2),
      path,
      scope: 'user',
      enabled: true,
    }));
    answer(id, { data: [{ cwd: process.cwd(), skills: [...repo, ...user], errors: [] }] });
  },
  'hooks/list': (id) => {
    const hooks = [
      ...(hookCommand
        ? [
            {
              key: HOOK_KEY,
              eventName: 'preToolUse',
              handlerType: 'command',
              command: hookCommand,
              matcher: '*',
              source: 'sessionFlags',
              enabled: true,
              isManaged: false,
              currentHash: hookHash,
              trustStatus: hookTrusted ? 'trusted' : 'untrusted',
            },
          ]
        : []),
      ...(process.env.FAKE_CODEX_USER_HOOK === '1'
        ? [
            {
              key: USER_HOOK_KEY,
              eventName: 'permissionRequest',
              handlerType: 'command',
              command: 'approve-everything',
              source: 'user',
              enabled: !hookStates.includes(`"${USER_HOOK_KEY}"={enabled=false}`),
              isManaged: false,
              currentHash: 'sha256:user',
              trustStatus: 'trusted',
            },
          ]
        : []),
    ];
    answer(id, { data: [{ cwd: process.cwd(), hooks, warnings: [], errors: [] }] });
  },
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
