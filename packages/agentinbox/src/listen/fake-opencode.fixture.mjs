// A stand-in for `opencode`, for the listener's tests. FAKE_OPENCODE_VERSION picks which OpenCode it is (1.19.5 by
// default), and it serves that one's API as OpenCode 1.19.5 and 2.2.0 were seen serving it (2026-10-29):
// - `--version` prints "1.19.5", or "opencode v2.2.0".
// - `auth list` (2: `auth list --standalone`) names the provider keys it finds in its environment.
// - `serve` starts an HTTP server with basic auth (user `opencode`, the password from OPENCODE_SERVER_PASSWORD, or
//   OPENCODE_PASSWORD for 2) and prints where it listens: "opencode server listening on http://…" (1), or
//   `{"url":"http://…"}` with `--stdio` (2), which ends when its input does.
//   OpenCode 1: events at `/event` as `{ type, properties }`; `/agent`, `/mcp`, `/session` (create), PATCH
//   `/session/:id` (404 for a session it doesn't keep), `/session/:id/prompt_async` (one turn at a time; a message that
//   comes while one runs joins it), `/session/:id/abort`, `/session/:id/message`, `/session/status`,
//   `/permission/:id/reply` and `/question/:id/reply|reject`. A turn is `session.status` busy … idle.
//   OpenCode 2: events at `/api/event` as `{ id, type, data }`; `/api/agent`, `/api/mcp`, `/api/session` (create),
//   PATCH `/api/session/:id`, its instruction entries, `/api/session/:id/prompt` (into the inbox, delivered to the
//   turn running at its next step, or to a new one), `/api/session/:id/interrupt` (what waits stays parked), DELETE
//   `/api/session/:id/inbox/:id`, `/api/session/:id/permission/:id/reply` and its forms. A turn is
//   `session.execution.started` … `succeeded|failed|interrupted`.
// Its tools ask by the agent's rules, then the session's (OpenCode 1 also by what an "always" allowed), the last that
// fits deciding: `ask` sends `permission.asked` and waits.
//
// What it does depends on the words in the person's message:
//   ask:<command>        runs <command> in the shell and reports the decision
//   ask-twice:<command>  runs <command> twice; an "always" allows the second
//   fetch:<url>          fetches <url>
//   outside:<folder>     works in <folder>, outside the project
//   mcp:<tool> [conv]    calls the AgentInbox MCP tool <tool> on <conv>, by default the conversation it was started
//                        for; an allowed `inbox_reply` replies through the fake API
//   askuser              asks the person which environment, with its question tool
//   form                 an MCP server asks for a form to be filled (OpenCode 2), which is not a question
//   sleep:<ms>           works for <ms> without asking; OpenCode 2 steers what comes meanwhile into the turn
//   reply-myself         runs `npx @agentinbox/cli reply <conversation> …`, then replies through the fake API
//   wait-for:<ms>        runs `npx @agentinbox/cli reply <conversation> ask …`, which waits <ms> for the answer
//   fail                 ends the turn as failed
//   remember             says how many messages its session has seen
//   rules                says the session's rules
//   instructions         says the instructions the listener gave it
//   env                  says which parent-session variables it was started with
//   anything else        echoes it
// FAKE_OPENCODE_LOG names a file that gets a line per start, per session opened and per message; FAKE_OPENCODE_SESSIONS
// a folder that keeps sessions. FAKE_OPENCODE_AGENT_RULES (JSON `{ name, pattern, effect }`) are its default agent's
// rules, FAKE_OPENCODE_MCP (JSON) its MCP servers' names, FAKE_OPENCODE_SLOW_START (ms) how long its server takes to
// start, FAKE_OPENCODE_SLOW_VERSION (ms) how long `--version` takes, FAKE_OPENCODE_SLOW_REPLY (ms) how long OpenCode 2
// takes to answer a prompt it already took, and FAKE_OPENCODE_CRASH makes it end on its first message. FAKE_OPENCODE_MCP_LATE makes OpenCode 2 list its
// MCP servers only once they start, a moment after it was first asked, as OpenCode 2 does, and say so with an event;
// `quiet` leaves the event out.
import { randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const version = process.env.FAKE_OPENCODE_VERSION ?? '1.19.5';
const major = Number(version.split('.')[0]);

if (argv[0] === '--version') {
  await new Promise((resolve) => setTimeout(resolve, Number(process.env.FAKE_OPENCODE_SLOW_VERSION ?? 0)));
  process.stdout.write(major >= 2 ? `opencode v${version}\n` : `${version}\n`);
  process.exit(0);
}
if (argv[0] === 'auth' && argv[1] === 'list') {
  const keys = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY'].filter((name) => process.env[name]);
  process.stdout.write(
    major >= 2
      ? keys.map((name) => `Provider  ${name}  environment\n`).join('')
      : `┌  Credentials \u001b[90m~/.local/share/opencode/auth.json\n└  0 credentials\n\n┌  Environment\n${keys.map((name) => `●  Provider \u001b[90m${name}\n`).join('')}└  ${keys.length} environment variables\n`
  );
  process.exit(0);
}
if (argv[0] !== 'serve') {
  process.stderr.write(`unknown command ${argv[0]}\n`);
  process.exit(1);
}

const logFile = process.env.FAKE_OPENCODE_LOG;
const sessionsDir = process.env.FAKE_OPENCODE_SESSIONS;
const apiUrl = process.env.FAKE_API_URL;
const log = (entry) => {
  if (logFile) appendFileSync(logFile, `${JSON.stringify(entry)}\n`);
};
log({ event: 'start', argv, cwd: process.cwd() });

const password =
  major >= 2
    ? (process.env.OPENCODE_PASSWORD ?? process.env.OPENCODE_SERVER_PASSWORD)
    : process.env.OPENCODE_SERVER_PASSWORD;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let counter = 0;
const newId = (prefix) =>
  `${prefix}_${(Date.now() * 4096 + ++counter).toString(16).slice(-12)}${randomBytes(7).toString('hex')}`;

const agentRules = JSON.parse(
  process.env.FAKE_OPENCODE_AGENT_RULES ??
    JSON.stringify([
      { name: '*', pattern: '*', effect: 'allow' },
      { name: 'external_directory', pattern: '*', effect: 'ask' },
      { name: 'external_directory', pattern: '/tmp/opencode/*', effect: 'allow' },
    ])
);
const mcpServers = JSON.parse(process.env.FAKE_OPENCODE_MCP ?? '["AgentInbox"]');
const mcpLate = major >= 2 ? process.env.FAKE_OPENCODE_MCP_LATE : undefined;
/** Resolves once the MCP servers have started; a model only sees their tools from then on. */
let mcpStarted = mcpLate ? undefined : Promise.resolve();

/** Starts the MCP servers the first time they're listed, when they start late. */
function startMcpServers() {
  mcpStarted ??= sleep(100).then(() => {
    if (mcpLate !== 'quiet') for (const server of mcpServers) emit('mcp.status.changed', { server });
  });
}

// --- sessions ---

const sessions = new Map();
const sessionFile = (id) => join(sessionsDir, `${id}.json`);

function keep(session) {
  if (!sessionsDir) return;
  mkdirSync(sessionsDir, { recursive: true });
  writeFileSync(sessionFile(session.id), JSON.stringify({ rules: session.rules, seen: session.seen }));
}

function sessionOf(id) {
  if (sessions.has(id)) return sessions.get(id);
  if (!sessionsDir || !existsSync(sessionFile(id))) return undefined;
  const kept = JSON.parse(readFileSync(sessionFile(id), 'utf8'));
  const session = newSession(id, kept.rules);
  session.seen = kept.seen;

  return session;
}

function newSession(id, rules) {
  const session = {
    id,
    rules,
    seen: 0,
    instructions: undefined,
    messages: [],
    busy: false,
    approved: [],
    inbox: [],
    execution: null,
    pending: new Map(),
  };
  sessions.set(id, session);

  return session;
}

/** Whether `text` fits `pattern`, where `*` stands for anything. */
function fits(text, pattern) {
  return new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`, 's').test(text);
}

/** What the rules say about `name` for `patterns`: the last rule that fits each one decides. */
function effectOf(session, name, patterns) {
  const rules = [...agentRules, ...session.rules, ...session.approved];
  const effects = patterns.map(
    (pattern) => rules.findLast((rule) => fits(name, rule.name) && fits(pattern, rule.pattern))?.effect ?? 'ask'
  );

  return effects.includes('deny') ? 'deny' : effects.includes('ask') ? 'ask' : 'allow';
}

// --- events ---

const clients = new Set();

function emit(type, payload) {
  const event = major >= 2 ? { id: newId('evt'), type, data: payload } : { type, properties: payload };
  for (const client of clients) client.write(`data: ${JSON.stringify(event)}\n\n`);
}

// --- what a turn does ---

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

/** Waits for an answer to one of its requests, or `aborted` once the turn stops. */
function waitFor(turn, requestId) {
  return new Promise((resolve) => {
    turn.session.pending.set(requestId, resolve);
  });
}

/** A tool call: it starts, asks when the rules say so, and ends. */
async function tool(turn, name, input, ask) {
  const callID = newId('call');
  toolStarted(turn, callID, name, input);
  const decision = ask ? await permitted(turn, callID, ask) : { allowed: true, reply: 'rules' };
  if (decision === 'aborted') return 'aborted';
  toolEnded(turn, callID, name, input, decision.allowed);

  return decision;
}

function toolStarted(turn, callID, name, input) {
  const call = { sessionID: turn.session.id, assistantMessageID: turn.assistantId, id: callID };
  if (major >= 2) {
    emit('session.tool.input.started', { ...call, name });
    emit('session.tool.called', { ...call, input });
  } else {
    emit('message.part.updated', { part: toolPart(turn, callID, name, 'pending', {}) });
    emit('message.part.updated', { part: toolPart(turn, callID, name, 'running', input) });
  }
}

function toolEnded(turn, callID, name, input, allowed) {
  if (major >= 2) {
    emit(allowed ? 'session.tool.success' : 'session.tool.failed', {
      sessionID: turn.session.id,
      assistantMessageID: turn.assistantId,
      id: callID,
    });
  } else {
    emit('message.part.updated', { part: toolPart(turn, callID, name, allowed ? 'completed' : 'error', input) });
  }
}

/** What the rules say about a tool call; when they say ask, what the answer to `permission.asked` says. */
async function permitted(turn, callID, ask) {
  const effect = effectOf(turn.session, ask.name, ask.patterns);
  if (effect !== 'ask') {
    return effect === 'deny' ? { allowed: false, reply: 'denied by the rules' } : { allowed: true, reply: 'rules' };
  }

  const id = newId('per');
  const always = ask.always ?? ['*'];
  emit(
    'permission.asked',
    major >= 2
      ? {
          id,
          sessionID: turn.session.id,
          action: ask.name,
          resources: ask.patterns,
          save: always,
          ...(ask.metadata ? { metadata: ask.metadata } : {}),
          source: { type: 'tool', messageID: turn.assistantId, id: callID },
        }
      : {
          id,
          sessionID: turn.session.id,
          permission: ask.name,
          patterns: ask.patterns,
          metadata: ask.metadata ?? {},
          always,
          tool: { messageID: turn.assistantId, callID },
        }
  );
  const answer = await waitFor(turn, id);
  if (answer === 'aborted') return 'aborted';
  if (answer.reply === 'always') {
    turn.session.approved.push(...always.map((pattern) => ({ name: ask.name, pattern, effect: 'allow' })));
  }

  return { allowed: answer.reply !== 'reject', reply: answer.reply, message: answer.message };
}

function toolPart(turn, callID, name, status, input) {
  return {
    id: `prt_${callID}`,
    sessionID: turn.session.id,
    messageID: turn.assistantId,
    type: 'tool',
    tool: name,
    callID,
    state: { status, input },
  };
}

const SHELL = major >= 2 ? 'shell' : 'bash';
const shell = (command) => ({
  name: SHELL,
  patterns: [command],
  always: [`${command.split(' ')[0]} *`],
  metadata: major >= 2 ? undefined : { command },
});
const told = (decision) => (decision.message ? ` Told: ${decision.message}` : '');

const BEHAVIORS = [
  [
    'ask-twice:',
    async (rest, turn) => {
      const command = rest.trim();
      const first = await tool(turn, SHELL, { command }, shell(command));
      if (first === 'aborted') return {};
      const second = first.allowed ? await tool(turn, SHELL, { command }, shell(command)) : first;
      if (second === 'aborted') return {};

      return first.allowed && second.allowed
        ? { answer: `Ran ${command} twice${first.reply === 'always' ? ', and was allowed for the session' : ''}.` }
        : { answer: `Not allowed.${told(second)}` };
    },
  ],
  [
    'ask:',
    async (rest, turn) => {
      const command = rest.trim();
      const decision = await tool(turn, SHELL, { command }, shell(command));
      if (decision === 'aborted') return {};

      return {
        answer: decision.allowed
          ? `Ran ${command} (${decision.reply}).`
          : `Not allowed (${decision.reply}).${told(decision)}`,
      };
    },
  ],
  [
    'fetch:',
    async (rest, turn) => {
      const url = rest.trim();
      const decision = await tool(turn, 'webfetch', { url }, { name: 'webfetch', patterns: [url], metadata: { url } });
      if (decision === 'aborted') return {};

      return { answer: decision.allowed ? `Fetched ${url} (${decision.reply}).` : `Not fetched.${told(decision)}` };
    },
  ],
  [
    'outside:',
    async (rest, turn) => {
      const folder = rest.trim();
      const decision = await tool(
        turn,
        'read',
        { filePath: `${folder}/notes.md` },
        {
          name: 'external_directory',
          patterns: [`${folder}/*`],
          always: [`${folder}/*`],
          metadata: major >= 2 ? undefined : { filepath: `${folder}/notes.md`, parentDir: folder },
        }
      );
      if (decision === 'aborted') return {};

      return {
        answer: decision.allowed
          ? `Worked in ${folder} (${decision.reply}).`
          : `Stayed in the project.${told(decision)}`,
      };
    },
  ],
  [
    'mcp:',
    async (rest, turn) => {
      startMcpServers();
      await mcpStarted;
      // The model sees tools of a server that started late only on its next step.
      if (mcpLate) await sleep(50);
      const [name, other] = rest.trim().split(/\s+/);
      const input = { conversation: other ?? conversationOf(turn.text), message: 'I replied through MCP.' };
      const decision = await tool(turn, `AgentInbox_${name}`, input, {
        name: `AgentInbox_${name}`,
        patterns: ['*'],
        metadata: major >= 2 ? { input } : undefined,
      });
      if (decision === 'aborted') return {};
      if (!decision.allowed) return { answer: `Not allowed.${told(decision)}` };
      if (name === 'inbox_reply') {
        await api('POST', '/v1/inbox/messages', {
          kind: 'tell',
          card: { title: input.message },
          thread: input.conversation,
        });
      }

      return { answer: `Used ${name} (${decision.reply}).` };
    },
  ],
  [
    'askuser',
    async (_rest, turn) => {
      const id = newId(major >= 2 ? 'frm' : 'que');
      // OpenCode reports the question tool's call too, before it asks.
      const callID = newId('call');
      const input = { questions: [{ question: 'Which one?', header: 'Environment', options: [] }] };
      toolStarted(turn, callID, 'question', input);
      if (major >= 2) {
        emit('form.created', {
          form: {
            id,
            sessionID: turn.session.id,
            title: 'Questions',
            metadata: { kind: 'question' },
            fields: [
              {
                key: 'q0',
                title: 'Environment',
                description: 'Which one?',
                type: 'string',
                options: [
                  { value: 'staging', label: 'Staging' },
                  { value: 'production', label: 'Production' },
                ],
              },
            ],
          },
        });
      } else {
        emit('question.asked', {
          id,
          sessionID: turn.session.id,
          questions: [
            {
              question: 'Which one?',
              header: 'Environment',
              options: [
                { label: 'Staging', description: '' },
                { label: 'Production', description: '' },
              ],
            },
          ],
        });
      }
      const answer = await waitFor(turn, id);
      if (answer === 'aborted') return {};
      toolEnded(turn, callID, 'question', input, true);

      return {
        answer:
          answer.cancelled !== undefined
            ? `No answer: ${answer.cancelled}`
            : `Answers: ${JSON.stringify(answer.answers ?? answer.answer)}`,
      };
    },
  ],
  [
    'form',
    async (_rest, turn) => {
      const id = newId('frm');
      emit('form.created', {
        form: {
          id,
          sessionID: 'global',
          title: 'Sign in to the tracker',
          metadata: { kind: 'mcp', server: 'tracker' },
          fields: [{ key: 'token', type: 'string', title: 'Token' }],
        },
      });
      const answer = await waitFor(turn, id);
      if (answer === 'aborted') return {};

      return { answer: answer.cancelled !== undefined ? `Form: declined (${answer.cancelled})` : 'Form: filled in.' };
    },
  ],
  [
    'sleep:',
    async (rest, turn) => {
      const callID = newId('call');
      const started = { sessionID: turn.session.id, assistantMessageID: turn.assistantId, id: callID };
      if (major >= 2) emit('session.tool.called', { ...started, input: { command: `sleep ${rest}` } });
      const ended = await Promise.race([sleep(Number(rest)).then(() => 'slept'), turn.stopped]);
      if (ended === 'aborted') return {};
      if (major >= 2) emit('session.tool.success', started);
      // A step ends: what was steered in meanwhile joins the turn.
      deliver(turn);

      return { answer: 'Done sleeping.' };
    },
  ],
  [
    'reply-myself',
    async (_rest, turn) => {
      const conversation = conversationOf(turn.text);
      const command = `npx @agentinbox/cli reply ${conversation} "I replied myself; all good."`;
      const decision = await tool(turn, SHELL, { command }, shell(command));
      if (decision === 'aborted') return {};
      if (!decision.allowed) return { answer: `Not allowed.${told(decision)}` };
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
    async (rest, turn) => {
      const callID = newId('call');
      const command = `npx @agentinbox/cli reply ${conversationOf(turn.text)} ask "Staging or prod?"`;
      if (major >= 2) {
        emit('session.tool.input.started', {
          sessionID: turn.session.id,
          assistantMessageID: turn.assistantId,
          id: callID,
          name: SHELL,
        });
        emit('session.tool.called', {
          sessionID: turn.session.id,
          assistantMessageID: turn.assistantId,
          id: callID,
          input: { command },
        });
      } else {
        emit('message.part.updated', { part: toolPart(turn, callID, SHELL, 'running', { command }) });
      }
      const ended = await Promise.race([sleep(Number(rest)).then(() => 'slept'), turn.stopped]);
      if (ended === 'aborted') return {};
      if (major >= 2)
        emit('session.tool.success', { sessionID: turn.session.id, assistantMessageID: turn.assistantId, id: callID });
      else emit('message.part.updated', { part: toolPart(turn, callID, SHELL, 'completed', { command }) });

      return { answer: 'Asked and got the answer.' };
    },
  ],
  ['fail', async () => ({ error: 'You have hit your usage limit.' })],
  ['remember', async (_rest, turn) => ({ answer: `This session has seen ${turn.session.seen} messages before.` })],
  ['rules', async (_rest, turn) => ({ answer: `Rules: ${JSON.stringify(turn.session.rules)}` })],
  ['instructions', async (_rest, turn) => ({ answer: `Instructions: ${turn.instructions ?? 'none'}` })],
  [
    'env',
    async () => {
      const marks = [
        'CLAUDECODE',
        'CLAUDE_CODE_SESSION_ID',
        'AI_AGENT',
        'OPENCODE',
        'OPENCODE_SESSION_ID',
        'INBOX_SECRET_KEY',
      ];
      const found = marks.filter((name) => process.env[name]);

      return { answer: `Parent marks: ${found.length ? found.join(', ') : 'none'}.` };
    },
  ],
];

/** OpenCode 2: what waits in the inbox joins the turn running. */
function deliver(turn) {
  if (major < 2) return;
  for (const item of turn.session.inbox.splice(0)) {
    turn.texts.push(item.text);
    emit('session.inbox.delivered', { sessionID: turn.session.id, inboxID: item.id });
  }
}

/** Runs one turn on the messages it takes (what the first says decides), and says how it ended. */
async function runTurn(session, texts, instructions) {
  if (process.env.FAKE_OPENCODE_CRASH === '1') {
    process.stderr.write('panic: the fake crashed\n');
    process.exit(3);
  }

  let stop;
  const text = texts[0];
  const turn = {
    session,
    text,
    texts: [...texts],
    instructions,
    assistantId: newId('msg'),
    stopped: new Promise((resolve) => {
      stop = () => resolve('aborted');
    }),
  };
  turn.stop = () => {
    stop();
    for (const [id, resolve] of session.pending) {
      session.pending.delete(id);
      emit('permission.replied', { sessionID: session.id, requestID: id, reply: 'reject' });
      resolve('aborted');
    }
  };
  session.turn = turn;
  const words = personText(text);
  const found = BEHAVIORS.find(([prefix]) => words.startsWith(prefix));
  const outcome = await Promise.race([
    found ? found[1](words.slice(found[0].length), turn) : Promise.resolve({ answer: `Echo: ${words}` }),
    turn.stopped.then(() => ({})),
  ]);
  const aborted = (await Promise.race([turn.stopped, Promise.resolve('running')])) === 'aborted';
  session.turn = null;
  session.seen += turn.texts.length;
  keep(session);
  if (aborted) return { status: 'interrupted' };
  if (outcome.error) return { status: 'failed', error: outcome.error, assistantId: turn.assistantId };

  const also = turn.texts.slice(1).map(personText);
  return {
    status: 'completed',
    assistantId: turn.assistantId,
    answer: `${outcome.answer ?? ''}${also.length > 0 ? ` Also: ${also.join(' / ')}` : ''}`,
  };
}

// OpenCode 1: one loop at a time; a message that comes while it runs joins it at its next step.
async function loop1(session) {
  session.busy = true;
  emit('session.status', { sessionID: session.id, status: { type: 'busy' } });
  for (;;) {
    const user = session.messages.findLast((message) => message.info.role === 'user');
    const answered = session.messages.some(
      (message) => message.info.role === 'assistant' && message.info.parentID === user.info.id
    );
    if (answered) break;
    const ended = await runTurn(
      session,
      user.parts.map((part) => part.text),
      user.system
    );
    const info = { id: ended.assistantId ?? newId('msg'), role: 'assistant', parentID: user.info.id };
    if (ended.status === 'interrupted') {
      info.error = { name: 'MessageAbortedError', data: { message: 'Aborted' } };
      emit('session.error', { sessionID: session.id, error: info.error });
    } else if (ended.status === 'failed') {
      info.error = { name: 'APIError', data: { message: ended.error } };
      emit('session.error', { sessionID: session.id, error: info.error });
    }
    session.messages.push({ info, parts: ended.answer ? [{ type: 'text', text: ended.answer }] : [] });
    if (ended.status !== 'completed') break;
  }
  session.busy = false;
  emit('session.status', { sessionID: session.id, status: { type: 'idle' } });
  emit('session.idle', { sessionID: session.id });
}

// OpenCode 2: an execution takes what waits in the inbox; one steered in after it ends starts the next.
async function execute2(session) {
  if (session.execution) return;
  session.execution = true;
  emit('session.execution.started', { sessionID: session.id });
  const first = session.inbox.shift();
  emit('session.inbox.delivered', { sessionID: session.id, inboxID: first.id });
  const ended = await runTurn(session, [first.text], session.instructions);
  if (ended.status === 'completed') {
    emit('session.text.ended', {
      sessionID: session.id,
      assistantMessageID: ended.assistantId,
      ordinal: 0,
      text: ended.answer,
    });
    emit('session.execution.succeeded', { sessionID: session.id });
  } else if (ended.status === 'failed') {
    emit('session.execution.failed', { sessionID: session.id, error: { type: 'api', message: ended.error } });
  } else {
    emit('session.execution.interrupted', { sessionID: session.id, reason: 'user' });
  }
  session.execution = null;
  // After an interrupt, what waits stays parked.
  if (ended.status !== 'interrupted' && session.inbox.length > 0) void execute2(session);
}

// --- the server ---

function send(res, status, body) {
  res.writeHead(status, body === undefined ? {} : { 'content-type': 'application/json' });
  res.end(body === undefined ? undefined : JSON.stringify(body));
}

async function bodyOf(req) {
  let text = '';
  for await (const chunk of req) text += chunk;
  return text ? JSON.parse(text) : {};
}

const v1Rules = (rules) => rules.map((rule) => ({ permission: rule.name, pattern: rule.pattern, action: rule.effect }));
const v2Rules = (rules) => rules.map((rule) => ({ action: rule.name, resource: rule.pattern, effect: rule.effect }));
const fromV1 = (rules) =>
  (rules ?? []).map((rule) => ({ name: rule.permission, pattern: rule.pattern, effect: rule.action }));
const fromV2 = (rules) =>
  (rules ?? []).map((rule) => ({ name: rule.action, pattern: rule.resource, effect: rule.effect }));

function settle(requestId, answer) {
  for (const session of sessions.values()) {
    const resolve = session.pending.get(requestId);
    if (resolve) {
      session.pending.delete(requestId);
      resolve(answer);
      return true;
    }
  }
  return false;
}

/** What OpenCode 1's server answers: each request's method and path, and what it does with what the path names. */
const ROUTES_1 = [
  [
    'GET',
    /^\/agent$/,
    (_req, res) =>
      send(res, 200, [
        { name: 'build', mode: 'primary', permission: v1Rules(agentRules) },
        { name: 'general', mode: 'subagent', permission: v1Rules(agentRules) },
      ]),
  ],
  [
    'GET',
    /^\/mcp$/,
    (_req, res) => send(res, 200, Object.fromEntries(mcpServers.map((name) => [name, { status: 'connected' }]))),
  ],
  [
    'GET',
    /^\/session\/status$/,
    (_req, res) =>
      send(
        res,
        200,
        Object.fromEntries(
          [...sessions.values()].filter((each) => each.busy).map((each) => [each.id, { type: 'busy' }])
        )
      ),
  ],
  [
    'POST',
    /^\/session$/,
    async (req, res, url) => {
      const session = newSession(newId('ses'), fromV1((await bodyOf(req)).permission));
      keep(session);
      log({ event: 'session', method: 'create', rules: session.rules });
      send(res, 200, { id: session.id, directory: url.searchParams.get('directory') });
    },
  ],
  [
    'PATCH',
    /^\/session\/([^/]+)$/,
    async (req, res, _url, [id]) => {
      const session = sessionOf(id);
      if (!session) return send(res, 404, { name: 'NotFoundError', data: { message: `Session not found: ${id}` } });
      session.rules = fromV1((await bodyOf(req)).permission);
      keep(session);
      log({ event: 'session', method: 'resume', rules: session.rules });
      send(res, 200, { id: session.id });
    },
  ],
  [
    'POST',
    /^\/session\/([^/]+)\/prompt_async$/,
    async (req, res, _url, [id]) => {
      const session = sessionOf(id);
      if (!session) return send(res, 404, { name: 'NotFoundError' });
      const body = await bodyOf(req);
      log({ event: 'prompt', messageID: body.messageID, system: body.system, parts: body.parts.length });
      session.messages.push({
        info: { id: body.messageID ?? newId('msg'), role: 'user' },
        parts: body.parts,
        system: body.system,
      });
      send(res, 204);
      if (!session.busy) void loop1(session);
    },
  ],
  [
    'POST',
    /^\/session\/([^/]+)\/abort$/,
    (_req, res, _url, [id]) => {
      sessionOf(id)?.turn?.stop();
      send(res, 200, true);
    },
  ],
  ['GET', /^\/session\/([^/]+)\/message$/, (_req, res, _url, [id]) => send(res, 200, sessionOf(id)?.messages ?? [])],
  [
    'POST',
    /^\/permission\/([^/]+)\/reply$/,
    async (req, res, _url, [id]) => {
      const body = await bodyOf(req);
      const session = [...sessions.values()].find((each) => each.pending.has(id));
      if (session) emit('permission.replied', { sessionID: session.id, requestID: id, reply: body.reply });
      send(res, settle(id, body) ? 200 : 404, true);
    },
  ],
  [
    'POST',
    /^\/question\/([^/]+)\/reply$/,
    async (req, res, _url, [id]) => send(res, settle(id, await bodyOf(req)) ? 200 : 404, true),
  ],
  [
    'POST',
    /^\/question\/([^/]+)\/reject$/,
    (_req, res, _url, [id]) => send(res, settle(id, { cancelled: 'dismissed' }) ? 200 : 404, true),
  ],
];

/** What OpenCode 2's server answers, the same way. */
const ROUTES_2 = [
  [
    'GET',
    /^\/api\/agent$/,
    (_req, res) =>
      send(res, 200, {
        data: [
          { id: 'build', name: 'Build', mode: 'primary', permissions: v2Rules(agentRules) },
          { id: 'compaction', name: 'Compaction', mode: 'primary', hidden: true, permissions: [] },
        ],
      }),
  ],
  [
    'GET',
    /^\/api\/mcp$/,
    (_req, res) => {
      const started = mcpStarted !== undefined;
      startMcpServers();
      send(res, 200, {
        location: { directory: process.cwd() },
        data: started ? mcpServers.map((name) => ({ name, status: { status: 'connected' } })) : [],
      });
    },
  ],
  [
    'POST',
    /^\/api\/session$/,
    async (req, res) => {
      const body = await bodyOf(req);
      const session = newSession(newId('ses'), fromV2(body.permissions));
      keep(session);
      log({ event: 'session', method: 'create', rules: session.rules, directory: body.location?.directory });
      send(res, 200, { data: { id: session.id, location: body.location } });
    },
  ],
  [
    'PATCH',
    /^\/api\/session\/([^/]+)$/,
    async (req, res, _url, [id]) => {
      const session = sessionOf(id);
      if (!session) return send(res, 404, { _tag: 'SessionNotFoundError', message: `Session not found: ${id}` });
      session.rules = fromV2((await bodyOf(req)).permissions);
      keep(session);
      log({ event: 'session', method: 'resume', rules: session.rules });
      send(res, 204);
    },
  ],
  [
    'PUT',
    /^\/api\/experimental\/session\/([^/]+)\/instructions\/entries\/([^/]+)$/,
    async (req, res, _url, [id, key]) => {
      const session = sessionOf(id);
      if (!session) return send(res, 404, { _tag: 'SessionNotFoundError' });
      session.instructions = (await bodyOf(req)).value;
      log({ event: 'instructions', key, value: session.instructions });
      send(res, 204);
    },
  ],
  [
    'POST',
    /^\/api\/session\/([^/]+)\/prompt$/,
    async (req, res, _url, [id]) => {
      const session = sessionOf(id);
      if (!session) return send(res, 404, { _tag: 'SessionNotFoundError' });
      const body = await bodyOf(req);
      const item = { id: body.id ?? newId('msg'), text: body.text, delivery: body.delivery ?? 'steer' };
      log({ event: 'prompt', id: item.id, delivery: item.delivery });
      session.inbox.push(item);
      const payload = { type: 'user', payload: { text: item.text }, delivery: item.delivery };
      emit('session.inbox.enqueued', { sessionID: session.id, inboxID: item.id, item: payload });
      const slowReply = Number(process.env.FAKE_OPENCODE_SLOW_REPLY ?? 0);
      if (slowReply > 0) {
        // It took the message and works on it; its answer is slow to come back.
        if (!session.execution) void execute2(session);
        await sleep(slowReply);
        return send(res, 200, { data: { id: item.id, sessionID: session.id, ...payload } });
      }
      send(res, 200, { data: { id: item.id, sessionID: session.id, ...payload } });
      if (!session.execution) void execute2(session);
    },
  ],
  [
    'POST',
    /^\/api\/session\/([^/]+)\/interrupt$/,
    (_req, res, _url, [id]) => {
      const session = sessionOf(id);
      const running = Boolean(session?.turn);
      session?.turn?.stop();
      send(res, 200, { interrupted: running });
    },
  ],
  [
    'DELETE',
    /^\/api\/session\/([^/]+)\/inbox\/([^/]+)$/,
    (_req, res, _url, [id, inboxID]) => {
      const session = sessionOf(id);
      if (session) {
        session.inbox = session.inbox.filter((item) => item.id !== inboxID);
        emit('session.inbox.cancelled', { sessionID: session.id, inboxID });
        log({ event: 'withdrawn', id: inboxID });
      }
      send(res, 204);
    },
  ],
  [
    'POST',
    /^\/api\/session\/([^/]+)\/permission\/([^/]+)\/reply$/,
    async (req, res, _url, [id, requestID]) => {
      const body = await bodyOf(req);
      emit('permission.replied', { sessionID: id, requestID, reply: body.decision });
      send(res, settle(requestID, { reply: body.decision, message: body.message }) ? 204 : 404);
    },
  ],
  [
    'POST',
    /^\/api\/session\/([^/]+)\/form\/([^/]+)\/reply$/,
    async (req, res, _url, [id, formID]) => {
      const body = await bodyOf(req);
      emit('form.replied', { id: formID, sessionID: id, answer: body.answer });
      send(res, settle(formID, { answer: body.answer }) ? 204 : 404);
    },
  ],
  [
    'DELETE',
    /^\/api\/session\/([^/]+)\/form\/([^/]+)$/,
    (_req, res, url, [id, formID]) => {
      emit('form.cancelled', { id: formID, sessionID: id });
      send(res, settle(formID, { cancelled: url.searchParams.get('message') ?? '' }) ? 204 : 404);
    },
  ],
];

/** Answers a request with the first route whose method and path fit, passing on what the path names. */
async function route(req, res, url) {
  for (const [method, path, handle] of major >= 2 ? ROUTES_2 : ROUTES_1) {
    const found = req.method === method ? path.exec(url.pathname) : null;
    if (found) return handle(req, res, url, found.slice(1));
  }

  return send(res, 404, major >= 2 ? { _tag: 'NotFound' } : { name: 'NotFoundError' });
}

const server = createServer((req, res) => {
  if (password && req.headers.authorization !== `Basic ${Buffer.from(`opencode:${password}`).toString('base64')}`) {
    return send(res, 401);
  }
  const url = new URL(req.url, 'http://127.0.0.1');
  if (req.method === 'GET' && url.pathname === (major >= 2 ? '/api/event' : '/event')) {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
    clients.add(res);
    req.on('close', () => clients.delete(res));
    res.write(
      `data: ${JSON.stringify(major >= 2 ? { id: newId('evt'), type: 'server.connected', data: {} } : { type: 'server.connected', properties: {} })}\n\n`
    );
    return;
  }
  route(req, res, url).catch((err) => send(res, 500, { message: String(err) }));
});

await sleep(Number(process.env.FAKE_OPENCODE_SLOW_START ?? 0));
server.listen(0, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${server.address().port}`;
  process.stdout.write(major >= 2 ? `${JSON.stringify({ url })}\n` : `opencode server listening on ${url}\n`);
});
if (major >= 2 && argv.includes('--stdio')) {
  process.stdin.on('end', () => process.exit(0));
  process.stdin.resume();
}
