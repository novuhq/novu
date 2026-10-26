import { Injectable } from '@nestjs/common';
import {
  type ConversationActivityEntity,
  ConversationActivityRepository,
  ConversationActivitySenderTypeEnum,
  ConversationActivityTypeEnum,
  ConversationRepository,
  type HumanInteractionEntity,
  HumanInteractionRepository,
  indexRevisions,
} from '@novu/dal';
import {
  HUMAN_INTERACTION_MAX_TTL_SECONDS,
  HumanInteractionKindEnum,
  HumanInteractionStatusEnum,
  humanInteractionApproveExtraActions,
  humanInteractionChooseOptions,
} from '@novu/shared';
import { Types } from 'mongoose';
import type { WakeAnswerDto, WakeMessageDto } from '../dtos/human-wake.dto';
import { type InboxRelayAgent, type InboxScope, readAttachments } from './human-inbox.service';
import type { Wakers } from './human-wake-access.service';
import type { WakeCursor } from './wake-cursor';

/**
 * How long a message has to be stored before a wait looks at it. By then the inbox has finished with it: the
 * conversation knows of it, and a reply that answers a question has settled that question, so it goes out
 * marked as the answer. A wait never reads past this, so a row stored a moment late is still read.
 */
export const WAKE_SETTLE_MS = 2_000;

/** Messages older than this never wake a host, however far back the cursor is: a computer that was off for a week doesn't wake for old news. */
export const WAKE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** The rows one look reads at most. The cursor goes on from the last of them. */
const ROWS_PER_LOOK = 200;

/** How long before it is answered a question can have been sent: the longest a question lives, and an hour to spare. */
const QUESTION_LIFETIME_MS = HUMAN_INTERACTION_MAX_TTL_SECONDS * 1000 + 60 * 60 * 1000;

/** A question is settled this soon after the reply that answers it is stored, or the reply isn't taken for its answer. */
const ANSWER_WINDOW_MS = 2 * 60 * 1000;

/** Leeway between the clocks of the servers that stored a reply and settled its question. */
const CLOCK_SLACK_MS = 5_000;

/** How a person settles a question. Expired, canceled and delivered are the system's doing. */
const SETTLED_BY_A_PERSON: readonly string[] = [
  HumanInteractionStatusEnum.ANSWERED,
  HumanInteractionStatusEnum.APPROVED,
  HumanInteractionStatusEnum.DENIED,
];

/** The approve card's own two buttons; any other id is one of its extra actions. */
const APPROVE_BUTTONS: readonly string[] = ['approve', 'deny'];

/** The signal resolving a conversation leaves in its history (`AgentConversationService.resolveConversation`). */
const RESOLVE_SIGNAL = 'resolve';

type WakeConversation = { identifier: string; isDirectMessage: boolean };

/** Where a row sits in the order rows are read in. */
type RowPosition = { at: number; id: string };

/** A person's answer to a card, as the inbox records it on the answer's row. */
type CardAnswer = {
  interactionIdentifier: string;
  kind: string;
  status?: string;
  optionId?: string;
  text?: string;
};

/** A question a reply answered, with the words it was settled with. */
type AnsweredQuestion = Pick<HumanInteractionEntity, 'identifier' | 'response'>;

/** What became of a look's messages since they were stored, by `messageKey`. */
type Revisions = {
  edits: Map<string, Pick<ConversationActivityEntity, 'content' | 'richContent'>>;
  deleted: Set<string>;
};

/** What one look knows about its rows besides the rows themselves. */
type LookContext = Revisions & {
  conversations: Map<string, WakeConversation>;
  wakers: Wakers;
  questionsAnswered: Map<string, AnsweredQuestion>;
  cards: Map<string, HumanInteractionEntity>;
  resolves: Map<string, RowPosition[]>;
};

/**
 * What one look found, and where the next goes on from. `more` when it stopped at the most rows one look reads,
 * so there may be more to read already, rather than at `limit` or at the end.
 */
export type WakeMessagesPage = { data: WakeMessageDto[]; next: WakeCursor; more: boolean };

/**
 * The messages that may wake an agent's host, read for the wake program's wait: what the people who can wake
 * the host wrote to the agent, and their answers to its cards, oldest first. The agent's own messages, the
 * system's and strangers' never count, nor a message that was deleted before it was read; one edited before it
 * was read is given as it reads now.
 *
 * Each message is one entry. A reply that answers a question is the person's message, marked with the question
 * it answered (`answersMessageId`); the question's own answer row then adds nothing. A pressed button leaves no
 * message, so the answer row is the entry, saying what the button says. Each entry says how many times its
 * conversation was resolved before it (`round`): a host keeps one session for each conversation and round.
 */
@Injectable()
export class HumanWakeMessagesService {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly activityRepository: ConversationActivityRepository,
    private readonly humanInteractionRepository: HumanInteractionRepository
  ) {}

  /**
   * One look: up to `limit` messages after `cursor` that were stored at least `WAKE_SETTLE_MS` before `now`, and
   * the cursor to go on from. The cursor moves past the rows that were looked at and didn't count as well, so
   * the next look doesn't read them again.
   */
  async read(
    scope: InboxScope,
    agent: Pick<InboxRelayAgent, '_id'>,
    wakers: Wakers,
    cursor: WakeCursor,
    limit: number,
    now: Date
  ): Promise<WakeMessagesPage> {
    const until = now.getTime() - WAKE_SETTLE_MS;
    const lookedAtAll: WakeMessagesPage = { data: [], next: until > cursor.at ? { at: until } : cursor, more: false };

    if (wakers.size === 0 || until <= cursor.at) {
      return lookedAtAll;
    }

    const conversations = await this.conversationsOf(scope, agent, wakers, cursor);
    if (conversations.size === 0) {
      return lookedAtAll;
    }

    const rows = await this.activityRepository.find(
      {
        _environmentId: scope.environmentId,
        _organizationId: scope.organizationId,
        _conversationId: { $in: [...conversations.keys()] },
        senderType: ConversationActivitySenderTypeEnum.SUBSCRIBER,
        senderId: { $in: [...wakers.keys()] },
        type: {
          $in: [ConversationActivityTypeEnum.MESSAGE, ConversationActivityTypeEnum.HUMAN_INTERACTION_RESPONSE],
        },
        $and: [{ createdAt: { $lte: new Date(until) } }, afterCursor(cursor)],
      },
      '*',
      { sort: { createdAt: 1, _id: 1 }, limit: ROWS_PER_LOOK }
    );
    if (rows.length === 0) {
      return lookedAtAll;
    }

    const [revisions, questionsAnswered, cards, resolves] = await Promise.all([
      this.revisionsOf(scope, rows),
      this.questionsAnsweredBy(scope, agent, rows),
      this.answeredCards(scope, rows),
      this.resolvesBefore(scope, rows),
    ]);
    const context: LookContext = { ...revisions, conversations, wakers, questionsAnswered, cards, resolves };

    const data: WakeMessageDto[] = [];
    for (const [index, row] of rows.entries()) {
      const message =
        row.type === ConversationActivityTypeEnum.MESSAGE ? toMessage(row, context) : toCardAnswer(row, context);

      if (message) {
        data.push(message);
      }

      // Full, or the look read all the rows it takes: the next one goes on from this row.
      const more = index === rows.length - 1 && rows.length === ROWS_PER_LOOK;
      if (data.length === limit || more) {
        return { data, next: positionOf(row), more };
      }
    }

    return { ...lookedAtAll, data };
  }

  /**
   * Every conversation of the agent where a row after the cursor can be: those someone who can wake is in that
   * were active since it (writing makes the writer one of its people and marks it active), and those of questions
   * answered since it (pressing a button does neither). Only what happened since the cursor counts, so none is
   * left out however many conversations the agent has.
   */
  private async conversationsOf(
    scope: InboxScope,
    agent: Pick<InboxRelayAgent, '_id'>,
    wakers: Wakers,
    cursor: WakeCursor
  ): Promise<Map<string, WakeConversation>> {
    const since = new Date(cursor.at - CLOCK_SLACK_MS).toISOString();
    const answered = await this.humanInteractionRepository.find(
      {
        _environmentId: scope.environmentId,
        _organizationId: scope.organizationId,
        _agentId: agent._id,
        'response.respondedAt': { $gte: since },
      },
      ['_conversationId']
    );
    const found = await this.conversationRepository.find(
      {
        _environmentId: scope.environmentId,
        _organizationId: scope.organizationId,
        _agentId: agent._id,
        $or: [
          { 'participants.id': { $in: [...wakers.keys()] }, lastActivityAt: { $gte: since } },
          { _id: { $in: answered.flatMap((question) => question._conversationId ?? []) } },
        ],
      },
      ['_id', 'identifier', 'isDirectMessage']
    );

    return new Map(
      found.map((conversation) => [
        String(conversation._id),
        // As the inbox reads it: a conversation from before this was stored was a direct one.
        { identifier: conversation.identifier, isDirectMessage: conversation.isDirectMessage !== false },
      ])
    );
  }

  /**
   * What became of the messages among `rows` since: the newest edit of each, and which were deleted, as the inbox
   * folds them. Each is a row of its own with the message's platform id, which is only unique in its conversation
   * (a Telegram message id is a number per chat), so they are told apart by conversation too.
   */
  private async revisionsOf(scope: InboxScope, rows: ConversationActivityEntity[]): Promise<Revisions> {
    const messages = rows.filter((row) => row.type === ConversationActivityTypeEnum.MESSAGE && row.platformMessageId);
    if (messages.length === 0) {
      return { edits: new Map(), deleted: new Set() };
    }

    const revisions = await this.activityRepository.find(
      {
        _environmentId: scope.environmentId,
        _organizationId: scope.organizationId,
        _conversationId: { $in: [...new Set(messages.map((row) => String(row._conversationId)))] },
        type: { $in: [ConversationActivityTypeEnum.EDIT, ConversationActivityTypeEnum.DELETE] },
        platformMessageId: { $in: messages.map((row) => row.platformMessageId as string) },
      },
      ['_id', '_conversationId', 'type', 'platformMessageId', 'content', 'richContent', 'sequence', 'createdAt']
    );
    const byConversation = new Map<string, typeof revisions>();
    for (const revision of revisions) {
      const conversationId = String(revision._conversationId);
      byConversation.set(conversationId, [...(byConversation.get(conversationId) ?? []), revision]);
    }

    const found: Revisions = { edits: new Map(), deleted: new Set() };
    for (const [conversationId, ofConversation] of byConversation) {
      const { latestEdit, deletedIds } = indexRevisions(ofConversation);
      for (const [platformMessageId, edit] of latestEdit) {
        found.edits.set(`${conversationId}:${platformMessageId}`, edit);
      }
      for (const platformMessageId of deletedIds) {
        found.deleted.add(`${conversationId}:${platformMessageId}`);
      }
    }

    return found;
  }

  /**
   * Which of the messages among `rows` answered a question, and which. A reply settles the question it answers
   * with its own words, by the same person, moments after it is stored; each question is the answer of one
   * message at most, the earliest that fits, even one an earlier look gave. Whoever answered counts, also someone
   * the question wasn't sent to, where anyone in the conversation may answer.
   */
  private async questionsAnsweredBy(
    scope: InboxScope,
    agent: Pick<InboxRelayAgent, '_id'>,
    rows: ConversationActivityEntity[]
  ): Promise<Map<string, AnsweredQuestion>> {
    const messages = rows.filter((row) => row.type === ConversationActivityTypeEnum.MESSAGE && row.content?.trim());
    if (messages.length === 0) {
      return new Map();
    }

    const senders = [...new Set(messages.map((row) => row.senderId))];
    const times = messages.map(timeOf);
    const first = Math.min(...times);
    const questions = await this.humanInteractionRepository.find(
      {
        _environmentId: scope.environmentId,
        _organizationId: scope.organizationId,
        _agentId: agent._id,
        kind: HumanInteractionKindEnum.ASK,
        status: HumanInteractionStatusEnum.ANSWERED,
        createdAt: { $gte: new Date(first - QUESTION_LIFETIME_MS) },
        'response.respondedBySubscriberId': { $in: senders },
        'response.respondedAt': {
          $gte: new Date(first - CLOCK_SLACK_MS).toISOString(),
          $lte: new Date(Math.max(...times) + ANSWER_WINDOW_MS).toISOString(),
        },
      },
      ['identifier', 'response']
    );
    if (questions.length === 0) {
      return new Map();
    }

    // The same words sent twice, a moment apart, can land on two pages: the earlier ones are read again, so a
    // question already given to a reply isn't given to the next one too.
    const answeredFrom = Math.min(...questions.map(({ response }) => Date.parse(response?.respondedAt ?? '')));
    const earlier = await this.activityRepository.find(
      {
        _environmentId: scope.environmentId,
        _organizationId: scope.organizationId,
        _conversationId: { $in: [...new Set(messages.map((row) => String(row._conversationId)))] },
        senderType: ConversationActivitySenderTypeEnum.SUBSCRIBER,
        senderId: { $in: senders },
        type: ConversationActivityTypeEnum.MESSAGE,
        createdAt: { $gte: new Date(answeredFrom - ANSWER_WINDOW_MS), $lt: new Date(first) },
      },
      ['_id', 'senderId', 'content', 'createdAt'],
      { sort: { createdAt: 1, _id: 1 } }
    );
    const ours = new Set(messages.map((row) => String(row._id)));

    return new Map(
      [...matchAnswers([...earlier, ...messages], questions)].filter(([messageId]) => ours.has(messageId))
    );
  }

  /** The cards whose answers are among `rows`, by their ids, for what their buttons say. */
  private async answeredCards(
    scope: InboxScope,
    rows: ConversationActivityEntity[]
  ): Promise<Map<string, HumanInteractionEntity>> {
    const identifiers = rows.flatMap((row) => readCardAnswer(row)?.interactionIdentifier ?? []);
    const found = await this.humanInteractionRepository.findByIdentifiers(scope.environmentId, scope.organizationId, [
      ...new Set(identifiers),
    ]);

    return new Map(found.map((interaction) => [interaction.identifier, interaction]));
  }

  /** When each conversation of `rows` was resolved, up to the newest of them, oldest first. */
  private async resolvesBefore(
    scope: InboxScope,
    rows: ConversationActivityEntity[]
  ): Promise<Map<string, RowPosition[]>> {
    const signals = await this.activityRepository.find(
      {
        _environmentId: scope.environmentId,
        _organizationId: scope.organizationId,
        _conversationId: { $in: [...new Set(rows.map((row) => String(row._conversationId)))] },
        type: ConversationActivityTypeEnum.SIGNAL,
        'signalData.type': RESOLVE_SIGNAL,
        createdAt: { $lte: new Date(Math.max(...rows.map(timeOf))) },
      },
      ['_id', '_conversationId', 'createdAt'],
      { sort: { createdAt: 1, _id: 1 } }
    );
    const resolves = new Map<string, RowPosition[]>();

    for (const signal of signals) {
      const conversationId = String(signal._conversationId);
      resolves.set(conversationId, [
        ...(resolves.get(conversationId) ?? []),
        { at: timeOf(signal), id: String(signal._id) },
      ]);
    }

    return resolves;
  }
}

/**
 * Pairs each message with the question it answered, if it answered one: the same person settled that question
 * with the same words, at most `ANSWER_WINDOW_MS` after the message was stored. A question goes to the earliest
 * message that fits it.
 */
export function matchAnswers(
  messages: Pick<ConversationActivityEntity, '_id' | 'senderId' | 'content' | 'createdAt'>[],
  questions: AnsweredQuestion[]
): Map<string, AnsweredQuestion> {
  const answered = new Map<string, AnsweredQuestion>();
  const taken = new Set<string>();

  for (const message of messages) {
    const at = timeOf(message);
    const text = message.content?.trim();
    const question = questions.find(({ identifier, response }) => {
      const respondedAt = response?.respondedAt ? Date.parse(response.respondedAt) : Number.NaN;

      return (
        !taken.has(identifier) &&
        response?.respondedBySubscriberId === message.senderId &&
        response.text?.trim() === text &&
        respondedAt >= at - CLOCK_SLACK_MS &&
        respondedAt <= at + ANSWER_WINDOW_MS
      );
    });

    if (question) {
      taken.add(question.identifier);
      answered.set(String(message._id), question);
    }
  }

  return answered;
}

/**
 * What a pressed button says: the option picked, the approve card's extra action, or that it was approved or
 * denied. The card's own labels when it can still be read, else its ids.
 */
export function answerText(answer: CardAnswer, card?: Pick<HumanInteractionEntity, 'kind' | 'content'>): string {
  const isApprove = answer.kind === HumanInteractionKindEnum.APPROVE;

  if (answer.optionId && card && !(isApprove && APPROVE_BUTTONS.includes(answer.optionId))) {
    const choices = isApprove ? humanInteractionApproveExtraActions(card) : humanInteractionChooseOptions(card);
    const label = choices.find((choice) => choice.id === answer.optionId)?.label;

    if (label) {
      return label;
    }
  }

  if (isApprove && (!answer.optionId || APPROVE_BUTTONS.includes(answer.optionId))) {
    return answer.status === HumanInteractionStatusEnum.APPROVED ? 'Approved' : 'Denied';
  }

  return answer.optionId ?? answer.text ?? '';
}

/** How many times the conversation was resolved before `row`: 0 if never. */
export function roundOf(
  row: Pick<ConversationActivityEntity, '_id' | 'createdAt'>,
  resolves: RowPosition[] = []
): number {
  const position = positionOf(row);

  return resolves.filter(({ at, id }) => at < position.at || (at === position.at && id < String(position.id))).length;
}

/**
 * A deleted message counts for nothing, and an edited one reads as it does now; a reply that answered a question
 * is marked with it.
 */
function toMessage(row: ConversationActivityEntity, context: LookContext): WakeMessageDto | null {
  const key = messageKey(row);
  if (context.deleted.has(key)) {
    return null;
  }

  const question = context.questionsAnswered.get(String(row._id));
  // As the inbox folds an edit: its words, and what came with it when it brought anything.
  const edit = context.edits.get(key);
  const current = edit
    ? { ...row, content: edit.content, ...(edit.richContent !== undefined ? { richContent: edit.richContent } : {}) }
    : row;
  const attachments = readAttachments(current);

  return entryOf(row, context, {
    text: current.content ?? '',
    ...(question
      ? {
          answersMessageId: question.identifier,
          answer: {
            status: HumanInteractionStatusEnum.ANSWERED,
            ...(question.response?.text ? { text: question.response.text } : {}),
          },
        }
      : {}),
    ...(attachments.length ? { attachments } : {}),
  });
}

/** A pressed button. An answer typed as a reply is the person's message already, so its answer row is left out. */
function toCardAnswer(row: ConversationActivityEntity, context: LookContext): WakeMessageDto | null {
  const answer = readCardAnswer(row);

  if (!answer || answer.kind === HumanInteractionKindEnum.ASK || !SETTLED_BY_A_PERSON.includes(answer.status ?? '')) {
    return null;
  }

  return entryOf(row, context, {
    text: answerText(answer, context.cards.get(answer.interactionIdentifier)),
    answersMessageId: answer.interactionIdentifier,
    answer: {
      status: answer.status as string,
      ...(answer.optionId ? { optionId: answer.optionId } : {}),
      ...(answer.text ? { text: answer.text } : {}),
    },
  });
}

function entryOf(
  row: ConversationActivityEntity,
  context: LookContext,
  content: {
    text: string;
    answersMessageId?: string;
    answer?: WakeAnswerDto;
    attachments?: WakeMessageDto['attachments'];
  }
): WakeMessageDto | null {
  const conversationId = String(row._conversationId);
  const conversation = context.conversations.get(conversationId);
  const sender = senderOf(row, context.wakers);

  if (!conversation || !sender) {
    return null;
  }

  return {
    id: row.identifier,
    conversationId: conversation.identifier,
    channel: row.platform,
    from: sender,
    text: content.text,
    at: new Date(timeOf(row)).toISOString(),
    ...(content.answersMessageId ? { answersMessageId: content.answersMessageId } : {}),
    round: roundOf(row, context.resolves.get(conversationId)),
    isDirectMessage: conversation.isDirectMessage,
    ...(content.answer ? { answer: content.answer } : {}),
    ...(content.attachments ? { attachments: content.attachments } : {}),
  };
}

function senderOf(row: ConversationActivityEntity, wakers: Wakers): WakeMessageDto['from'] | null {
  const waker = wakers.get(row.senderId);
  if (!waker) {
    return null;
  }

  const name = waker.name ?? row.senderName?.trim();

  return { id: waker.id, ...(name ? { name } : {}), isOperator: waker.isOperator };
}

/** The answer an answer row records, as `HumanInteractionActivityRecorder` writes it. */
function readCardAnswer(row: ConversationActivityEntity): CardAnswer | null {
  if (row.type !== ConversationActivityTypeEnum.HUMAN_INTERACTION_RESPONSE) {
    return null;
  }

  const raw = row.richContent?.humanInteraction as Partial<CardAnswer> | undefined;
  if (!raw?.interactionIdentifier || !raw.kind) {
    return null;
  }

  return {
    interactionIdentifier: raw.interactionIdentifier,
    kind: raw.kind,
    ...(raw.status ? { status: raw.status } : {}),
    ...(raw.optionId ? { optionId: raw.optionId } : {}),
    ...(raw.text ? { text: raw.text } : {}),
  };
}

/** Rows stored after the cursor: later, or at the same moment and after it in the order rows are read in. */
function afterCursor(cursor: WakeCursor) {
  const at = new Date(cursor.at);

  return cursor.id
    ? { $or: [{ createdAt: { $gt: at } }, { createdAt: at, _id: { $gt: new Types.ObjectId(cursor.id) } }] }
    : { createdAt: { $gt: at } };
}

function positionOf(row: Pick<ConversationActivityEntity, '_id' | 'createdAt'>): RowPosition {
  return { at: timeOf(row), id: String(row._id) };
}

function messageKey(row: Pick<ConversationActivityEntity, '_conversationId' | 'platformMessageId'>): string {
  return `${String(row._conversationId)}:${row.platformMessageId}`;
}

/** A row's `createdAt`, which the database hands back as a date, in epoch ms. */
function timeOf(row: Pick<ConversationActivityEntity, 'createdAt'>): number {
  return new Date(row.createdAt).getTime();
}
