import { Injectable } from '@nestjs/common';
import { DirectionEnum } from '@novu/shared';
import { type ClientSession, FilterQuery, Types } from 'mongoose';
import { EnforceEnvOrOrgIds } from '../../types';
import { SortOrder } from '../../types/sort-order';
import { BaseRepositoryV2 } from '../base-repository-v2';
import {
  ActivityView,
  compileActivityViewMatch,
  viewFoldsRevisions,
  viewUsesSequencePagination,
} from './activity-views';
import {
  ConversationActivityDBModel,
  ConversationActivityEntity,
  ConversationActivitySenderTypeEnum,
  ConversationActivitySignalData,
  ConversationActivityToolData,
  ConversationActivityTypeEnum,
  type RunLifecycleActivityType,
} from './conversation-activity.entity';
import { ConversationActivity } from './conversation-activity.schema';
import { foldMessageRevisions, indexRevisions } from './message-revisions';

const LIST_ACTIVITIES_SORT_FIELDS = ['_id', 'createdAt'] as const;
type ListActivitiesSortField = (typeof LIST_ACTIVITIES_SORT_FIELDS)[number];

function resolveListActivitiesSortBy(sortBy?: string): ListActivitiesSortField {
  if (sortBy && (LIST_ACTIVITIES_SORT_FIELDS as readonly string[]).includes(sortBy)) {
    return sortBy as ListActivitiesSortField;
  }

  return 'createdAt';
}

/** Up to this many inbound messages are counted exactly, with deleted ones left out. */
const INBOUND_COUNT_EXACT_LIMIT = 200;

/** `human:<interaction>:response` → `human:<interaction>:request`, the two rows one card is stored as. */
function humanInteractionRequestIdentifierOf(responseIdentifier: string): string | undefined {
  const match = /^(human:.+):response$/.exec(responseIdentifier);

  return match ? `${match[1]}:request` : undefined;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class ConversationActivityRepository extends BaseRepositoryV2<
  ConversationActivityDBModel,
  ConversationActivityEntity,
  EnforceEnvOrOrgIds
> {
  constructor() {
    super(ConversationActivity, ConversationActivityEntity);
  }

  async findByConversation(
    environmentId: string,
    conversationId: string,
    limit = 20
  ): Promise<ConversationActivityEntity[]> {
    return this.find({ _environmentId: environmentId, _conversationId: conversationId }, '*', {
      sort: { createdAt: -1 },
      limit,
    });
  }

  async listForView(params: {
    view: ActivityView;
    environmentId: string;
    organizationId: string;
    conversationId: string;
    limit: number;
    /** Sequence cursor toward older history — only for `client_events`. */
    before?: string;
  }): Promise<{ data: ConversationActivityEntity[]; hasMore: boolean }> {
    const viewMatch = compileActivityViewMatch(params.view);

    if (viewUsesSequencePagination(params.view)) {
      const query: FilterQuery<ConversationActivityDBModel> & EnforceEnvOrOrgIds = {
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
        _conversationId: params.conversationId,
        sequence: { $type: 'number' },
        ...viewMatch,
      };

      if (params.before) {
        const cursor = await this.findOne(
          {
            _environmentId: params.environmentId,
            _organizationId: params.organizationId,
            _conversationId: params.conversationId,
            _id: params.before,
          },
          '*'
        );

        if (!cursor || typeof cursor.sequence !== 'number') {
          return { data: [], hasMore: false };
        }

        query.$and = [
          {
            $or: [{ sequence: { $lt: cursor.sequence } }, { sequence: cursor.sequence, _id: { $lt: cursor._id } }],
          },
        ];
      }

      const fetchLimit = params.limit + 1;
      const data = await this.find(query, '*', {
        sort: { sequence: -1, _id: -1 },
        limit: fetchLimit,
      });

      return {
        data: data.slice(0, params.limit),
        hasMore: data.length > params.limit,
      };
    }

    const data = await this.find(
      {
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
        _conversationId: params.conversationId,
        ...viewMatch,
      },
      '*',
      {
        sort: { createdAt: -1 },
        limit: params.limit,
      }
    );

    if (!viewFoldsRevisions(params.view)) {
      return { data, hasMore: false };
    }

    let folded = await this.foldViewPage(params, data);
    if (folded.length < params.limit && data.length === params.limit) {
      const refill = await this.find(
        {
          _environmentId: params.environmentId,
          _organizationId: params.organizationId,
          _conversationId: params.conversationId,
          ...viewMatch,
        },
        '*',
        {
          sort: { createdAt: -1 },
          limit: params.limit * 2,
        }
      );
      folded = (await this.foldViewPage(params, refill)).slice(0, params.limit);
    }

    return { data: folded, hasMore: false };
  }

  async findMessageRevisions(
    environmentId: string,
    conversationId: string,
    platformMessageIds: string[]
  ): Promise<ConversationActivityEntity[]> {
    const ids = [...new Set(platformMessageIds.filter(Boolean))];
    if (ids.length === 0) {
      return [];
    }

    return this.find(
      {
        _environmentId: environmentId,
        _conversationId: conversationId,
        platformMessageId: { $in: ids },
        type: { $in: [ConversationActivityTypeEnum.EDIT, ConversationActivityTypeEnum.DELETE] },
      },
      '*'
    );
  }

  private async foldViewPage(
    params: { environmentId: string; conversationId: string },
    data: ConversationActivityEntity[]
  ): Promise<ConversationActivityEntity[]> {
    const revisions = await this.findMessageRevisions(
      params.environmentId,
      params.conversationId,
      data.map((row) => row.platformMessageId).filter((id): id is string => Boolean(id))
    );

    if (revisions.length === 0) {
      return data;
    }

    return foldMessageRevisions(data, revisions);
  }

  /** Resolves the activity for a specific platform-native message id (e.g. the message a reaction targets). */
  async findByPlatformMessageId(
    environmentId: string,
    conversationId: string,
    platformMessageId: string
  ): Promise<ConversationActivityEntity | null> {
    return this.findOne(
      {
        _environmentId: environmentId,
        _conversationId: conversationId,
        platformMessageId,
        type: ConversationActivityTypeEnum.MESSAGE,
      },
      '*'
    );
  }

  async findExistingPlatformMessageIds(
    environmentId: string,
    conversationId: string,
    platformMessageIds: string[]
  ): Promise<Set<string>> {
    if (platformMessageIds.length === 0) {
      return new Set();
    }

    const activities = await this.find(
      {
        _environmentId: environmentId,
        _conversationId: conversationId,
        platformMessageId: { $in: platformMessageIds },
      },
      ['platformMessageId']
    );

    return new Set(activities.flatMap((activity) => (activity.platformMessageId ? [activity.platformMessageId] : [])));
  }

  async countAgentMessages(environmentId: string, conversationId: string): Promise<number> {
    return this.count({
      _environmentId: environmentId,
      _conversationId: conversationId,
      senderType: ConversationActivitySenderTypeEnum.AGENT,
      type: ConversationActivityTypeEnum.MESSAGE,
    });
  }

  /** Inbound human messages newer than `since` (all of them when absent) — the Human inbox unread count. */
  async countInboundMessagesSince(params: {
    environmentId: string;
    organizationId: string;
    conversationId: string;
    since?: string;
    /** Count up to and including this moment, instead of up to now. */
    until?: string;
  }): Promise<number> {
    const scope = {
      _environmentId: params.environmentId,
      _organizationId: params.organizationId,
      _conversationId: params.conversationId,
    };
    const fromHuman = {
      $in: [ConversationActivitySenderTypeEnum.SUBSCRIBER, ConversationActivitySenderTypeEnum.PLATFORM_USER],
    };
    const messages: FilterQuery<ConversationActivityDBModel> & EnforceEnvOrOrgIds = {
      ...scope,
      type: ConversationActivityTypeEnum.MESSAGE,
      senderType: fromHuman,
      ...(params.since || params.until
        ? {
            createdAt: {
              ...(params.since ? { $gt: new Date(params.since) } : {}),
              ...(params.until ? { $lte: new Date(params.until) } : {}),
            },
          }
        : {}),
    };
    // One fixed set of messages is read and the deleted ones are taken out of it, so a message that
    // arrives or is deleted meanwhile cannot skew the result. Past the cap the exact number stops
    // mattering, and the plain count is cheaper than reading every row.
    const counted = await this.find(messages, ['platformMessageId'], { limit: INBOUND_COUNT_EXACT_LIMIT + 1 });

    if (counted.length === 0) {
      return 0;
    }

    if (counted.length > INBOUND_COUNT_EXACT_LIMIT) {
      return this.count(messages);
    }

    // A deleted message keeps its row; the delete is a row of its own with the same platform message id.
    const countedIds = counted.flatMap((row) => row.platformMessageId ?? []);
    const deletes = countedIds.length
      ? await this.find(
          {
            ...scope,
            type: ConversationActivityTypeEnum.DELETE,
            senderType: fromHuman,
            platformMessageId: { $in: countedIds },
          },
          ['platformMessageId']
        )
      : [];
    const deletedIds = new Set(deletes.map((row) => row.platformMessageId));

    return counted.filter((row) => !row.platformMessageId || !deletedIds.has(row.platformMessageId)).length;
  }

  /**
   * Messages and human-interaction rows of a thread for the Human inbox, newest first. `before` is
   * the identifier of the oldest row of the previous page. `includeSystem` adds the system lines:
   * messages from the system and timeline signals such as "resolved".
   */
  async findInboxMessages(params: {
    environmentId: string;
    organizationId: string;
    conversationId: string;
    limit: number;
    before?: string;
    includeSystem?: boolean;
  }): Promise<{ data: ConversationActivityEntity[]; hasMore: boolean }> {
    const scope = {
      _environmentId: params.environmentId,
      _organizationId: params.organizationId,
      _conversationId: params.conversationId,
    };
    const query: FilterQuery<ConversationActivityDBModel> & EnforceEnvOrOrgIds = {
      ...scope,
      $or: [
        {
          type: ConversationActivityTypeEnum.MESSAGE,
          ...(params.includeSystem ? {} : { senderType: { $ne: ConversationActivitySenderTypeEnum.SYSTEM } }),
        },
        {
          type: {
            $in: [
              ConversationActivityTypeEnum.HUMAN_INTERACTION_REQUEST,
              ConversationActivityTypeEnum.HUMAN_INTERACTION_RESPONSE,
            ],
          },
        },
        ...(params.includeSystem
          ? [{ type: ConversationActivityTypeEnum.SIGNAL, $nor: [{ 'signalData.type': 'tool-use' }] }]
          : []),
      ],
    };

    let cursor: Pick<ConversationActivityEntity, '_id' | 'createdAt'> | null = null;

    if (params.before) {
      cursor = await this.findOne({ ...scope, identifier: params.before }, ['_id', 'createdAt']);

      if (!cursor) {
        return { data: [], hasMore: false };
      }
    }

    // Card copies and deleted messages are dropped, which can leave a batch short, so batches are
    // read until the page and the one row that proves there is more are filled.
    const batchSize = params.limit + 1;
    const rows: ConversationActivityEntity[] = [];

    while (rows.length < batchSize) {
      const batch = await this.find(
        cursor
          ? {
              ...query,
              $and: [
                {
                  $or: [
                    { createdAt: { $lt: new Date(cursor.createdAt) } },
                    { createdAt: new Date(cursor.createdAt), _id: { $lt: new Types.ObjectId(cursor._id) } },
                  ],
                },
              ],
            }
          : query,
        '*',
        { sort: { createdAt: -1, _id: -1 }, limit: batchSize }
      );

      rows.push(...(await this.foldViewPage(params, await this.withoutInteractionCardCopies(scope, batch))));

      if (batch.length < batchSize) {
        break;
      }

      cursor = batch[batch.length - 1];
    }

    return { data: rows.slice(0, params.limit), hasMore: rows.length > params.limit };
  }

  /**
   * A card sent into a thread is stored up to three times: as the agent's message, as the interaction
   * request, and as the interaction response once it settles. The request row carries the
   * interaction, so the other two are dropped, also when the rows fall on different pages.
   */
  private async withoutInteractionCardCopies(
    scope: { _environmentId: string; _organizationId: string; _conversationId: string },
    rows: ConversationActivityEntity[]
  ): Promise<ConversationActivityEntity[]> {
    const isAgentMessage = (row: ConversationActivityEntity) =>
      row.type === ConversationActivityTypeEnum.MESSAGE &&
      row.senderType === ConversationActivitySenderTypeEnum.AGENT &&
      Boolean(row.platformMessageId);
    const isResponse = (row: ConversationActivityEntity) =>
      row.type === ConversationActivityTypeEnum.HUMAN_INTERACTION_RESPONSE;
    const candidateIds = rows.filter(isAgentMessage).flatMap((row) => row.platformMessageId ?? []);
    const requestIdentifiers = rows
      .filter(isResponse)
      .flatMap((row) => humanInteractionRequestIdentifierOf(row.identifier) ?? []);

    if (candidateIds.length === 0 && requestIdentifiers.length === 0) {
      return rows;
    }

    const requests = await this.find(
      {
        ...scope,
        type: ConversationActivityTypeEnum.HUMAN_INTERACTION_REQUEST,
        $or: [{ platformMessageId: { $in: candidateIds } }, { identifier: { $in: requestIdentifiers } }],
      },
      ['platformMessageId', 'identifier']
    );
    const requestMessageIds = new Set(requests.flatMap((request) => request.platformMessageId ?? []));
    const foundRequestIdentifiers = new Set(requests.map((request) => request.identifier));

    return rows.filter((row) => {
      if (isAgentMessage(row)) {
        return !requestMessageIds.has(row.platformMessageId as string);
      }

      if (isResponse(row)) {
        // A response whose request row was never stored is the only trace of the card, so it stays.
        const requestIdentifier = humanInteractionRequestIdentifierOf(row.identifier);

        return !requestIdentifier || !foundRequestIdentifiers.has(requestIdentifier);
      }

      return true;
    });
  }

  /**
   * How many rows a full read of the thread returns, system lines left out: messages that were not
   * deleted, and each card once.
   */
  async countInboxMessages(params: {
    environmentId: string;
    organizationId: string;
    conversationId: string;
  }): Promise<number> {
    const scope = {
      _environmentId: params.environmentId,
      _organizationId: params.organizationId,
      _conversationId: params.conversationId,
    };
    const message = {
      ...scope,
      type: ConversationActivityTypeEnum.MESSAGE,
      senderType: { $ne: ConversationActivitySenderTypeEnum.SYSTEM },
    };
    const [messages, requests, responses, deletes] = await Promise.all([
      this.count(message),
      this.find({ ...scope, type: ConversationActivityTypeEnum.HUMAN_INTERACTION_REQUEST }, [
        'platformMessageId',
        'identifier',
      ]),
      this.find({ ...scope, type: ConversationActivityTypeEnum.HUMAN_INTERACTION_RESPONSE }, ['identifier']),
      this.find({ ...scope, type: ConversationActivityTypeEnum.DELETE }, ['platformMessageId']),
    ]);
    // A deleted message and the message copy of a card are both stored, and neither is shown.
    const hiddenIds = [...requests, ...deletes].flatMap((row) => row.platformMessageId ?? []);
    const hidden = hiddenIds.length
      ? await this.count({ ...message, platformMessageId: { $in: [...new Set(hiddenIds)] } })
      : 0;

    // A response whose request row was never stored is shown as the card, so it counts as one.
    const requestIdentifiers = new Set(requests.map((request) => request.identifier));
    const responsesAlone = responses.filter((response) => {
      const requestIdentifier = humanInteractionRequestIdentifierOf(response.identifier);

      return !requestIdentifier || !requestIdentifiers.has(requestIdentifier);
    }).length;

    return messages - hidden + requests.length + responsesAlone;
  }

  /**
   * Who did the newest thing in each conversation: wrote a message, sent a card, or answered one.
   * System rows are skipped. Conversations with nothing in them are absent from the result.
   */
  async findLatestInboxSenderTypes(params: {
    environmentId: string;
    organizationId: string;
    conversationIds: string[];
  }): Promise<Map<string, ConversationActivitySenderTypeEnum>> {
    if (params.conversationIds.length === 0) {
      return new Map();
    }

    const types = [
      ConversationActivityTypeEnum.MESSAGE,
      ConversationActivityTypeEnum.HUMAN_INTERACTION_REQUEST,
      ConversationActivityTypeEnum.HUMAN_INTERACTION_RESPONSE,
    ];
    const rows: Array<{
      _id: Types.ObjectId;
      senderType: ConversationActivitySenderTypeEnum;
      type: ConversationActivityTypeEnum;
      platformMessageId?: string;
    }> = await this.aggregate([
      {
        $match: {
          _conversationId: { $in: params.conversationIds.map((id) => new Types.ObjectId(id)) },
          _environmentId: new Types.ObjectId(params.environmentId),
          _organizationId: new Types.ObjectId(params.organizationId),
          type: { $in: types },
          senderType: { $ne: ConversationActivitySenderTypeEnum.SYSTEM },
        },
      },
      // Both descending, so the `{ _conversationId, createdAt }` index serves the sort.
      { $sort: { _conversationId: -1, createdAt: -1 } },
      {
        $group: {
          _id: '$_conversationId',
          senderType: { $first: '$senderType' },
          type: { $first: '$type' },
          platformMessageId: { $first: '$platformMessageId' },
        },
      },
    ]);
    const latest = new Map(rows.map((row) => [String(row._id), row.senderType]));

    // A deleted message stays stored, so the newest row can be one nobody sees any more. Those few
    // conversations are read again, newest first, until a message that is still there turns up.
    const newestMessages = rows.filter(
      (row) => row.type === ConversationActivityTypeEnum.MESSAGE && row.platformMessageId
    );
    const deletes = newestMessages.length
      ? await this.find(
          {
            _environmentId: params.environmentId,
            _organizationId: params.organizationId,
            _conversationId: { $in: newestMessages.map((row) => String(row._id)) },
            type: ConversationActivityTypeEnum.DELETE,
            platformMessageId: { $in: newestMessages.map((row) => row.platformMessageId as string) },
          },
          ['_conversationId', 'platformMessageId']
        )
      : [];
    const deleted = new Set(deletes.map((row) => `${row._conversationId}:${row.platformMessageId}`));

    await Promise.all(
      newestMessages
        .filter((row) => deleted.has(`${row._id}:${row.platformMessageId}`))
        .map(async (row) => {
          const conversationId = String(row._id);
          const senderType = await this.findLatestVisibleSenderType({ ...params, conversationId, types });

          if (senderType) {
            latest.set(conversationId, senderType);
          } else {
            latest.delete(conversationId);
          }
        })
    );

    return latest;
  }

  /** Who did the newest thing still shown in one conversation, deleted messages skipped. */
  private async findLatestVisibleSenderType(params: {
    environmentId: string;
    organizationId: string;
    conversationId: string;
    types: ConversationActivityTypeEnum[];
  }): Promise<ConversationActivitySenderTypeEnum | undefined> {
    const batchSize = 20;
    let cursor: Pick<ConversationActivityEntity, '_id' | 'createdAt'> | undefined;

    for (;;) {
      const batch = await this.find(
        {
          _environmentId: params.environmentId,
          _organizationId: params.organizationId,
          _conversationId: params.conversationId,
          type: { $in: params.types },
          senderType: { $ne: ConversationActivitySenderTypeEnum.SYSTEM },
          ...(cursor
            ? {
                $or: [
                  { createdAt: { $lt: new Date(cursor.createdAt) } },
                  { createdAt: new Date(cursor.createdAt), _id: { $lt: new Types.ObjectId(cursor._id) } },
                ],
              }
            : {}),
        },
        '*',
        { sort: { createdAt: -1, _id: -1 }, limit: batchSize }
      );
      const [visible] = await this.foldViewPage(params, batch);

      if (visible) {
        return visible.senderType;
      }

      if (batch.length < batchSize) {
        return undefined;
      }

      cursor = batch[batch.length - 1];
    }
  }

  /**
   * The conversations, out of the given ones, where a message or a card contains `text`, any case.
   * A message is matched on the text it shows now: its newest edit, and not at all once deleted.
   * There is no text index, so this reads the messages of the given conversations: keep that set bounded.
   */
  async findConversationIdsWithText(params: {
    environmentId: string;
    organizationId: string;
    conversationIds: string[];
    text: string;
  }): Promise<string[]> {
    if (params.conversationIds.length === 0) {
      return [];
    }

    const scope = { _environmentId: params.environmentId, _organizationId: params.organizationId };
    const pattern = escapeRegExp(params.text);
    const contains = { $regex: pattern, $options: 'i' };
    const matching = (conversationIds: string[]): FilterQuery<ConversationActivityDBModel> & EnforceEnvOrOrgIds => ({
      ...scope,
      _conversationId: { $in: conversationIds },
      senderType: { $ne: ConversationActivitySenderTypeEnum.SYSTEM },
      $or: [
        {
          type: { $in: [ConversationActivityTypeEnum.MESSAGE, ConversationActivityTypeEnum.EDIT] },
          content: contains,
        },
        {
          type: ConversationActivityTypeEnum.HUMAN_INTERACTION_REQUEST,
          $or: [
            { content: contains },
            { 'richContent.humanInteraction.title': contains },
            { 'richContent.humanInteraction.subtitle': contains },
            { 'richContent.humanInteraction.body': contains },
          ],
        },
      ],
    });
    const candidates = (await this.MongooseModel.distinct('_conversationId', matching(params.conversationIds))).map(
      String
    );

    if (candidates.length === 0) {
      return [];
    }

    // Only conversations with an edit or a delete can show something else than what is stored.
    const revised = (
      await this.MongooseModel.distinct('_conversationId', {
        ...scope,
        _conversationId: { $in: candidates },
        type: { $in: [ConversationActivityTypeEnum.EDIT, ConversationActivityTypeEnum.DELETE] },
      })
    ).map(String);

    if (revised.length === 0) {
      return candidates;
    }

    const [hits, revisions] = await Promise.all([
      this.find(matching(revised), ['_id', '_conversationId', 'type', 'platformMessageId']),
      this.find(
        {
          ...scope,
          _conversationId: { $in: revised },
          type: { $in: [ConversationActivityTypeEnum.EDIT, ConversationActivityTypeEnum.DELETE] },
        },
        ['_id', '_conversationId', 'type', 'platformMessageId', 'content', 'sequence', 'createdAt']
      ),
    ]);
    const shown = new RegExp(pattern, 'i');
    const stillMatching = new Set<string>();

    for (const conversationId of revised) {
      const { latestEdit, deletedIds } = indexRevisions(
        revisions.filter((row) => String(row._conversationId) === conversationId)
      );
      const matches = hits
        .filter((row) => String(row._conversationId) === conversationId)
        .some((row) => {
          if (row.type === ConversationActivityTypeEnum.HUMAN_INTERACTION_REQUEST || !row.platformMessageId) {
            return row.type !== ConversationActivityTypeEnum.EDIT;
          }

          if (deletedIds.has(row.platformMessageId)) {
            return false;
          }

          const edit = latestEdit.get(row.platformMessageId);

          // An edit matches only while it is the newest one; the original only while its newest edit still does.
          return row.type === ConversationActivityTypeEnum.EDIT
            ? String(edit?._id) === String(row._id)
            : !edit || shown.test(edit.content ?? '');
        });

      if (matches) {
        stillMatching.add(conversationId);
      }
    }

    return candidates.filter((id) => !revised.includes(id) || stillMatching.has(id));
  }

  async countActivities(environmentId: string, organizationId: string, conversationId: string): Promise<number> {
    return this.count({
      _environmentId: environmentId,
      _organizationId: organizationId,
      _conversationId: conversationId,
    });
  }

  /**
   * Repoint SUBSCRIBER-authored activities from `fromSubscriberId` to
   * `toSubscriberId` (both external `subscriberId` strings, stored in
   * `senderId`). Used by the email adoption merge so past timeline entries stay
   * attributed to the surviving identity. Returns the number of activities
   * updated.
   */
  async repointSubscriberSender(params: {
    environmentId: string;
    organizationId: string;
    fromSubscriberId: string;
    toSubscriberId: string;
  }): Promise<number> {
    const result = await this.update(
      {
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
        senderType: ConversationActivitySenderTypeEnum.SUBSCRIBER,
        senderId: params.fromSubscriberId,
      },
      { $set: { senderId: params.toSubscriberId } }
    );

    return result.modified;
  }

  async createUserActivity(params: {
    identifier: string;
    conversationId: string;
    platform: string;
    integrationId: string;
    platformThreadId: string;
    senderType: ConversationActivitySenderTypeEnum;
    senderId: string;
    content: string;
    richContent?: Record<string, unknown>;
    platformMessageId?: string;
    senderName?: string;
    sequence?: number;
    type?: ConversationActivityTypeEnum;
    environmentId: string;
    organizationId: string;
  }): Promise<ConversationActivityEntity> {
    return this.create({
      identifier: params.identifier,
      _conversationId: params.conversationId,
      type: params.type ?? ConversationActivityTypeEnum.MESSAGE,
      platform: params.platform,
      _integrationId: params.integrationId,
      platformThreadId: params.platformThreadId,
      senderType: params.senderType,
      senderId: params.senderId,
      content: params.content,
      richContent: params.richContent,
      platformMessageId: params.platformMessageId,
      senderName: params.senderName,
      ...(params.sequence !== undefined ? { sequence: params.sequence } : {}),
      _environmentId: params.environmentId,
      _organizationId: params.organizationId,
    });
  }

  async importUserActivities(
    params: {
      conversationId: string;
      platform: string;
      integrationId: string;
      platformThreadId: string;
      messages: Array<{
        identifier: string;
        senderId: string;
        senderName?: string;
        content: string;
        platformMessageId: string;
        sequence: number;
      }>;
      environmentId: string;
      organizationId: string;
    },
    session?: ClientSession | null
  ): Promise<number> {
    const firstCreatedAt = Date.now() - params.messages.length;
    const conversationId = new Types.ObjectId(params.conversationId);
    const integrationId = new Types.ObjectId(params.integrationId);
    const environmentId = new Types.ObjectId(params.environmentId);
    const organizationId = new Types.ObjectId(params.organizationId);
    const operations = params.messages.map((message, index) => ({
      updateOne: {
        filter: {
          _environmentId: environmentId,
          identifier: message.identifier,
        },
        update: {
          $setOnInsert: {
            identifier: message.identifier,
            _conversationId: conversationId,
            type: ConversationActivityTypeEnum.MESSAGE,
            platform: params.platform,
            _integrationId: integrationId,
            platformThreadId: params.platformThreadId,
            senderType: ConversationActivitySenderTypeEnum.PLATFORM_USER,
            senderId: message.senderId,
            senderName: message.senderName,
            content: message.content,
            platformMessageId: message.platformMessageId,
            sequence: message.sequence,
            _environmentId: environmentId,
            _organizationId: organizationId,
            createdAt: new Date(firstCreatedAt + index),
          },
        },
        upsert: true,
      },
    }));

    const result = await this.MongooseModel.bulkWrite(operations, {
      ordered: true,
      ...(session ? { session } : {}),
    });

    return result.upsertedCount;
  }

  async createAgentActivity(params: {
    identifier: string;
    conversationId: string;
    platform: string;
    integrationId: string;
    platformThreadId: string;
    agentId: string;
    content: string;
    richContent?: Record<string, unknown>;
    toolData?: ConversationActivityToolData;
    type?: ConversationActivityTypeEnum;
    senderName?: string;
    platformMessageId?: string;
    sequence?: number;
    environmentId: string;
    organizationId: string;
    session?: ClientSession | null;
  }): Promise<ConversationActivityEntity> {
    const type = params.type ?? ConversationActivityTypeEnum.MESSAGE;

    return this.create(
      {
        identifier: params.identifier,
        _conversationId: params.conversationId,
        type,
        platform: params.platform,
        _integrationId: params.integrationId,
        platformThreadId: params.platformThreadId,
        senderType: ConversationActivitySenderTypeEnum.AGENT,
        senderId: params.agentId,
        content: params.content,
        richContent: params.richContent,
        toolData: params.toolData,
        senderName: params.senderName,
        ...(params.platformMessageId !== undefined ? { platformMessageId: params.platformMessageId } : {}),
        ...(params.sequence !== undefined ? { sequence: params.sequence } : {}),
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
      },
      params.session ? { session: params.session } : {}
    );
  }

  async createSignalActivity(params: {
    identifier: string;
    conversationId: string;
    platform: string;
    integrationId: string;
    platformThreadId: string;
    agentId: string;
    content: string;
    signalData: ConversationActivitySignalData;
    platformMessageId?: string;
    environmentId: string;
    organizationId: string;
  }): Promise<ConversationActivityEntity> {
    return this.create({
      identifier: params.identifier,
      _conversationId: params.conversationId,
      type: ConversationActivityTypeEnum.SIGNAL,
      platform: params.platform,
      _integrationId: params.integrationId,
      platformThreadId: params.platformThreadId,
      senderType: ConversationActivitySenderTypeEnum.SYSTEM,
      senderId: params.agentId,
      content: params.content,
      signalData: params.signalData,
      platformMessageId: params.platformMessageId,
      _environmentId: params.environmentId,
      _organizationId: params.organizationId,
    });
  }

  async createToolActivity(params: {
    identifier: string;
    conversationId: string;
    platform: string;
    integrationId: string;
    platformThreadId: string;
    senderType: ConversationActivitySenderTypeEnum;
    senderId: string;
    senderName?: string;
    content: string;
    type: ConversationActivityTypeEnum;
    toolData: ConversationActivityToolData;
    richContent?: Record<string, unknown>;
    sequence?: number;
    environmentId: string;
    organizationId: string;
    platformMessageId?: string;
  }): Promise<ConversationActivityEntity> {
    return this.create({
      identifier: params.identifier,
      _conversationId: params.conversationId,
      type: params.type,
      platform: params.platform,
      _integrationId: params.integrationId,
      platformThreadId: params.platformThreadId,
      senderType: params.senderType,
      senderId: params.senderId,
      senderName: params.senderName,
      content: params.content,
      toolData: params.toolData,
      ...(params.richContent !== undefined ? { richContent: params.richContent } : {}),
      ...(params.platformMessageId !== undefined ? { platformMessageId: params.platformMessageId } : {}),
      ...(params.sequence !== undefined ? { sequence: params.sequence } : {}),
      _environmentId: params.environmentId,
      _organizationId: params.organizationId,
    });
  }

  async createRunActivity(params: {
    identifier: string;
    conversationId: string;
    platform: string;
    integrationId: string;
    platformThreadId: string;
    senderId: string;
    content: string;
    type: RunLifecycleActivityType;
    richContent?: Record<string, unknown>;
    sequence?: number;
    environmentId: string;
    organizationId: string;
  }): Promise<ConversationActivityEntity> {
    return this.create({
      identifier: params.identifier,
      _conversationId: params.conversationId,
      type: params.type,
      platform: params.platform,
      _integrationId: params.integrationId,
      platformThreadId: params.platformThreadId,
      senderType: ConversationActivitySenderTypeEnum.AGENT,
      senderId: params.senderId,
      content: params.content,
      ...(params.richContent !== undefined ? { richContent: params.richContent } : {}),
      ...(params.sequence !== undefined ? { sequence: params.sequence } : {}),
      _environmentId: params.environmentId,
      _organizationId: params.organizationId,
    });
  }

  async findToolActivitiesByPlanMessageId(
    environmentId: string,
    conversationId: string,
    planMessageId: string
  ): Promise<ConversationActivityEntity[]> {
    return this.find(
      {
        _environmentId: environmentId,
        _conversationId: conversationId,
        type: ConversationActivityTypeEnum.SIGNAL,
        'signalData.type': 'tool-use',
        'signalData.payload.planMessageId': planMessageId,
      } as FilterQuery<ConversationActivityDBModel> & EnforceEnvOrOrgIds,
      '*',
      { sort: { createdAt: 1 } }
    );
  }

  async listActivities({
    organizationId,
    environmentId,
    conversationId,
    limit = 20,
    after,
    before,
    sortBy = 'createdAt',
    sortDirection = 1,
    includeCursor = false,
    view,
  }: {
    organizationId: string;
    environmentId: string;
    conversationId: string;
    limit?: number;
    after?: string;
    before?: string;
    sortBy?: string;
    sortDirection?: SortOrder;
    includeCursor?: boolean;
    view?: ActivityView;
  }): Promise<{
    data: ConversationActivityEntity[];
    next: string | null;
    previous: string | null;
    totalCount: number;
    totalCountCapped: boolean;
  }> {
    if (before && after) {
      throw new Error('Cannot specify both "before" and "after" cursors at the same time.');
    }

    const validatedSortBy = resolveListActivitiesSortBy(sortBy);

    let activity: ConversationActivityEntity | null = null;
    const id = before || after;

    if (id) {
      activity = await this.findOne(
        {
          _environmentId: environmentId,
          _organizationId: organizationId,
          _conversationId: conversationId,
          _id: id,
        },
        '*'
      );

      if (!activity) {
        return { data: [], next: null, previous: null, totalCount: 0, totalCountCapped: false };
      }
    }

    const afterCursor =
      after && activity ? { sortBy: activity[validatedSortBy], paginateField: activity._id } : undefined;
    const beforeCursor =
      before && activity ? { sortBy: activity[validatedSortBy], paginateField: activity._id } : undefined;

    const query: FilterQuery<ConversationActivityDBModel> & EnforceEnvOrOrgIds = {
      _environmentId: environmentId,
      _organizationId: organizationId,
      _conversationId: conversationId,
      ...(view ? compileActivityViewMatch(view) : {}),
    };

    const pagination = await this.findWithCursorBasedPagination({
      after: afterCursor,
      before: beforeCursor,
      paginateField: '_id',
      limit,
      sortDirection: sortDirection === 1 ? DirectionEnum.ASC : DirectionEnum.DESC,
      sortBy: validatedSortBy,
      includeCursor,
      query,
      select: '*',
    });

    return pagination;
  }
}
