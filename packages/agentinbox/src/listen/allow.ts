import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInteraction, getInteraction, type Interaction } from '../api/agent-inbox';
import type { ApiClient } from '../api/client';
import type { Listening } from '../api/listen';
import { sleep } from '../poll';
import { startWaitIndicator } from '../spinner';
import { hostNameOf } from './hosts';
import { listenDir } from './state';
import { allowCard } from './words';

/** How long the operator has to answer an agent's request to start listening. */
export const ALLOW_TTL_SECONDS = 60 * 60;

const POLL_MS = 2_000;

/** `allowed`: go on. `denied`, `expired`: don't. `pending`: the wait ran out and the question stays open. */
export type AllowOutcome = 'allowed' | 'denied' | 'expired' | 'pending';

export interface AllowIo {
  /** A person at this terminal (not an agent's command): they answer here, not on their phone. */
  personAtTerminal: boolean;
  prompt(question: string): Promise<string>;
  /** A line for whoever ran the command. */
  say(line: string): void;
}

/** A question to the operator that is still waiting for its answer. */
export interface AskedAllow {
  interactionId: string;
  expiresAt: string;
  /**
   * Its words: the same request asks no new question. One that reads otherwise now, say because another computer
   * listens meanwhile and allowing it moves listening from there, asks anew: the operator allows what they read.
   */
  title: string;
  body?: string;
}

/**
 * Where that question is kept between runs of the command, apart from the state a running listener writes: an
 * agent whose command stopped waiting runs it again and goes on waiting on the same question.
 */
export interface AskedStore {
  load(): AskedAllow | null;
  save(asked: AskedAllow | null): void;
}

export const fileAsked: AskedStore = {
  load() {
    try {
      return JSON.parse(readFileSync(join(listenDir(), 'allow.json'), 'utf8')) as AskedAllow;
    } catch {
      return null;
    }
  },
  save(asked) {
    const file = join(listenDir(), 'allow.json');
    if (!asked) {
      rmSync(file, { force: true });

      return;
    }
    mkdirSync(listenDir(), { recursive: true });
    writeFileSync(file, `${JSON.stringify(asked, null, 2)}\n`, { mode: 0o600 });
  },
};

export interface AllowRequest {
  client: ApiClient;
  agentIdentifier: string;
  /** The operator's contact id: the question goes to them. */
  operatorId: string | undefined;
  hostName: string;
  computerId: string;
  computerName: string;
  /** The project as the operator reads it. */
  project: string;
  /** Where the agent is listening now, when it's another computer or another host here: allowing moves it. */
  elsewhere: Listening | null;
  /** What the operator should know before they allow it, such as a project Claude Code hasn't trusted yet. */
  notes?: readonly string[];
  asked: AskedStore;
  /** How long to wait for an answer, in seconds; until the question expires when not given. */
  timeoutSeconds?: number;
  io: AllowIo;
}

/**
 * Asks before it starts listening, and before listening moves here from another computer. A person at a terminal
 * answers there. When an agent ran the command, the operator gets an `approve` with Allow and Deny, and
 * nothing is taken until they allow it.
 */
export async function askToAllow(request: AllowRequest): Promise<AllowOutcome> {
  const card = allowCard({
    hostName: request.hostName,
    computerName: request.computerName,
    project: request.project,
    elsewhere: request.elsewhere,
    computerId: request.computerId,
    notes: request.notes,
    hostNames: hostNameOf,
  });

  if (request.io.personAtTerminal) {
    if (request.elsewhere) {
      request.io.say(card.body);
    }
    const answer = await request.io.prompt(`${card.title} [y/N] `);

    return /^y(es)?$/i.test(answer.trim()) ? 'allowed' : 'denied';
  }

  if (!request.operatorId) {
    throw new Error(
      'Your operator has to allow this, and this computer doesn’t know who they are yet: ask them to run the same command in their own terminal.'
    );
  }

  const question = await openQuestion(request, card);
  const deadline =
    request.timeoutSeconds === undefined ? Date.parse(question.expiresAt) : Date.now() + request.timeoutSeconds * 1000;
  const stop = startWaitIndicator(
    `Asked your operator on ${question.platform} to allow it (${question.id})`,
    'nothing starts until they do'
  );

  try {
    let current = question;
    while (current.status === 'pending' && Date.now() < deadline) {
      await sleep(Math.min(POLL_MS, Math.max(0, deadline - Date.now())));
      current = await getInteraction(request.client, current.id);
    }

    const outcome = outcomeOf(current);
    if (outcome !== 'pending') {
      request.asked.save(null);
    }

    return outcome;
  } finally {
    stop();
  }
}

function outcomeOf(question: Interaction): AllowOutcome {
  switch (question.status) {
    case 'approved':
      return 'allowed';
    case 'denied':
      return 'denied';
    case 'pending':
      return 'pending';
    default:
      return 'expired';
  }
}

/** The question already waiting for this same request, or a new one. */
async function openQuestion(request: AllowRequest, card: { title: string; body: string }): Promise<Interaction> {
  const asked = request.asked.load();

  if (asked && asked.title === card.title && asked.body === card.body && Date.parse(asked.expiresAt) > Date.now()) {
    const earlier = await getInteraction(request.client, asked.interactionId).catch(() => null);
    if (earlier && (earlier.status === 'pending' || earlier.status === 'approved')) {
      request.io.say('Your operator was asked already: waiting for their answer.');

      return earlier;
    }
  }

  const question = await createInteraction(request.client, {
    kind: 'approve',
    card: { ...card, approveLabel: 'Allow', denyLabel: 'Deny' },
    to: request.operatorId,
    from: request.hostName,
    ttlSeconds: ALLOW_TTL_SECONDS,
    agentIdentifier: request.agentIdentifier,
  });
  request.asked.save({ interactionId: question.id, expiresAt: question.expiresAt, title: card.title, body: card.body });

  return question;
}
