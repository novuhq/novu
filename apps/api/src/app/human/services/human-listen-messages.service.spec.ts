import { ConversationActivitySenderTypeEnum, ConversationActivityTypeEnum } from '@novu/dal';
import { HumanInteractionKindEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import type { ListenedPerson } from './human-listen-access.service';
import {
  answerText,
  HumanListenMessagesService,
  LISTEN_SETTLE_MS,
  matchAnswers,
  roundOf,
} from './human-listen-messages.service';

describe('HumanListenMessagesService', () => {
  const scope = { environmentId: 'env1', organizationId: 'org1' };
  const agent = { _id: 'relay1' };
  const now = new Date('2026-10-24T12:00:00.000Z');
  const listenedTo = new Map<string, ListenedPerson>([
    ['ada', { id: 'ada', name: 'Ada', isOperator: true }],
    ['bob', { id: 'bob', name: 'Bob', isOperator: false }],
  ]);

  let rowCount = 0;
  function row(fields: Record<string, unknown>): Record<string, any> {
    rowCount += 1;

    return {
      _id: `6720aa0b1c2d3e4f5a6b${String(rowCount).padStart(4, '0')}`,
      identifier: `act_${rowCount}`,
      _conversationId: 'conv1',
      type: ConversationActivityTypeEnum.MESSAGE,
      senderType: ConversationActivitySenderTypeEnum.SUBSCRIBER,
      senderId: 'ada',
      platform: 'telegram',
      content: `message ${rowCount}`,
      createdAt: new Date(now.getTime() - 60_000 + rowCount),
      ...fields,
    };
  }

  function setup({
    rows = [] as Array<Record<string, any>>,
    revisions = [] as Array<Record<string, any>>,
    earlier = [] as Array<Record<string, any>>,
    resolves = [] as Array<Record<string, any>>,
    questions = [] as Array<Record<string, any>>,
    answeredSince = [] as Array<Record<string, any>>,
    cards = [] as Array<Record<string, any>>,
    conversations = [{ _id: 'conv1', identifier: 'conv_one' }] as Array<Record<string, any>>,
  } = {}) {
    const conversationRepository = { find: sinon.stub().resolves(conversations) };
    const activityRepository = {
      find: sinon.stub().callsFake(async (query: { type: any; createdAt?: { $lt?: Date } }) => {
        if (query.type?.$in?.includes(ConversationActivityTypeEnum.EDIT)) {
          return revisions;
        }
        if (query.type === ConversationActivityTypeEnum.SIGNAL) {
          return resolves;
        }

        // Before the look's first message: the replies a question may have gone to already.
        return query.createdAt?.$lt ? earlier : rows;
      }),
    };
    const humanInteractionRepository = {
      // The questions replies may have answered, or those answered since the cursor, for their conversations.
      find: sinon.stub().callsFake(async (query: { kind?: string }) => (query.kind ? questions : answeredSince)),
      findByIdentifiers: sinon.stub().resolves(cards),
    };
    const service = new HumanListenMessagesService(
      conversationRepository as never,
      activityRepository as never,
      humanInteractionRepository as never
    );

    return { service, conversationRepository, activityRepository, humanInteractionRepository };
  }

  it('reads nothing that was stored too recently to have settled, and goes on from there', async () => {
    const { service, conversationRepository } = setup();
    const cursor = { at: now.getTime() - LISTEN_SETTLE_MS + 1 };

    const page = await service.read(scope, agent, listenedTo, cursor, 20, now);

    expect(page).to.deep.equal({ data: [], next: cursor, more: false });
    expect(conversationRepository.find.called).to.equal(false);
  });

  it('reads nothing while it listens to nobody, and moves past what was stored meanwhile', async () => {
    const { service } = setup();

    const page = await service.read(scope, agent, new Map(), { at: now.getTime() - 60_000 }, 20, now);

    expect(page).to.deep.equal({ data: [], next: { at: now.getTime() - LISTEN_SETTLE_MS }, more: false });
  });

  it('gives each message with its conversation, channel, sender and time, oldest first', async () => {
    const first = row({ content: 'deploy please' });
    const second = row({ senderId: 'bob', senderName: 'Bob on Telegram', platform: 'slack', content: 'me too' });
    const { service, activityRepository } = setup({ rows: [first, second] });

    const page = await service.read(scope, agent, listenedTo, { at: now.getTime() - 120_000 }, 20, now);

    expect(page.data).to.deep.equal([
      {
        id: first.identifier,
        conversationId: 'conv_one',
        channel: 'telegram',
        from: { id: 'ada', name: 'Ada', isOperator: true },
        text: 'deploy please',
        at: first.createdAt.toISOString(),
        round: 0,
        isDirectMessage: true,
      },
      {
        id: second.identifier,
        conversationId: 'conv_one',
        channel: 'slack',
        from: { id: 'bob', name: 'Bob', isOperator: false },
        text: 'me too',
        at: second.createdAt.toISOString(),
        round: 0,
        isDirectMessage: true,
      },
    ]);
    expect(page.next).to.deep.equal({ at: now.getTime() - LISTEN_SETTLE_MS });

    // What the people it listens to wrote, and anyone's answer to the agent's questions, in this environment.
    const query = activityRepository.find.firstCall.args[0];
    expect(query).to.deep.include({
      _environmentId: 'env1',
      _organizationId: 'org1',
      _conversationId: { $in: ['conv1'] },
      senderType: ConversationActivitySenderTypeEnum.SUBSCRIBER,
    });
    expect(query.$and[2]).to.deep.equal({
      $or: [
        { type: ConversationActivityTypeEnum.MESSAGE, senderId: { $in: ['ada', 'bob'] } },
        { type: ConversationActivityTypeEnum.HUMAN_INTERACTION_RESPONSE },
      ],
    });
  });

  it('stops at the limit, and goes on from the last message it gave', async () => {
    const rows = [row({}), row({}), row({})];
    const { service } = setup({ rows });

    const page = await service.read(scope, agent, listenedTo, { at: now.getTime() - 120_000 }, 2, now);

    expect(page.data.map((message) => message.id)).to.deep.equal([rows[0].identifier, rows[1].identifier]);
    expect(page.next).to.deep.equal({ at: rows[1].createdAt.getTime(), id: rows[1]._id });
    expect(page.more).to.equal(false);
  });

  it('leaves out a message that was deleted before it was read', async () => {
    const kept = row({ platformMessageId: 'tg-1' });
    const deleted = row({ platformMessageId: 'tg-2' });
    const { service } = setup({
      rows: [kept, deleted],
      revisions: [{ _conversationId: 'conv1', platformMessageId: 'tg-2', type: ConversationActivityTypeEnum.DELETE }],
    });

    const page = await service.read(scope, agent, listenedTo, { at: now.getTime() - 120_000 }, 20, now);

    expect(page.data.map((message) => message.id)).to.deep.equal([kept.identifier]);
  });

  it('gives an edited message as it reads now, told apart from the same platform id in another chat', async () => {
    const edited = row({ platformMessageId: 'tg-7', content: 'deploy production' });
    const elsewhere = row({ _conversationId: 'conv2', platformMessageId: 'tg-7', content: 'hello from another chat' });
    const edit = (_id: string, content: string, sequence: number) => ({
      _id,
      _conversationId: 'conv1',
      platformMessageId: 'tg-7',
      type: ConversationActivityTypeEnum.EDIT,
      content,
      sequence,
    });
    const { service } = setup({
      rows: [edited, elsewhere],
      revisions: [edit('e2', 'deploy staging', 2), edit('e1', 'deploy qa', 1)],
      conversations: [
        { _id: 'conv1', identifier: 'conv_one' },
        { _id: 'conv2', identifier: 'conv_two' },
      ],
    });

    const page = await service.read(scope, agent, listenedTo, { at: now.getTime() - 120_000 }, 20, now);

    expect(page.data.map(({ id, text }) => ({ id, text }))).to.deep.equal([
      { id: edited.identifier, text: 'deploy staging' },
      { id: elsewhere.identifier, text: 'hello from another chat' },
    ]);
  });

  it('reads every conversation where something happened since the cursor, however many the agent has', async () => {
    const { service, conversationRepository } = setup({
      rows: [row({})],
      answeredSince: [{ _conversationId: 'conv9' }, {}],
    });
    const cursor = { at: now.getTime() - 120_000 };

    await service.read(scope, agent, listenedTo, cursor, 20, now);

    const [query, , options] = conversationRepository.find.firstCall.args;
    // Written in since the cursor, with a few seconds for the clocks; or where a question answered since was asked.
    expect(query.$or).to.deep.equal([
      {
        'participants.id': { $in: ['ada', 'bob'] },
        lastActivityAt: { $gte: new Date(cursor.at - 5_000).toISOString() },
      },
      { _id: { $in: ['conv9'] } },
    ]);
    expect(options).to.equal(undefined);
  });

  it('reads where the questions answered since were asked, from a while back: an answer’s row comes once the card is edited', async () => {
    const { service, conversationRepository, humanInteractionRepository } = setup({
      rows: [row({})],
      answeredSince: [{ _conversationId: 'conv9' }, { _conversationId: 'conv9' }],
    });
    const cursor = { at: now.getTime() - 120_000 };

    await service.read(scope, agent, listenedTo, cursor, 20, now);

    const [answeredQuery, answeredFields] = humanInteractionRepository.find.firstCall.args;
    expect(answeredQuery['response.respondedAt']).to.deep.equal({
      $gte: new Date(cursor.at - 5_000 - 10 * 60_000).toISOString(),
    });
    expect(answeredFields).to.deep.equal(['_conversationId']);
    expect(conversationRepository.find.firstCall.args[0].$or[1]).to.deep.equal({ _id: { $in: ['conv9'] } });
  });

  describe('answers to a question sent to people outside its conversation', () => {
    const SHIP_IT = {
      identifier: 'hi_ship',
      kind: HumanInteractionKindEnum.APPROVE,
      _conversationId: 'conv1',
      content: { cardChrome: { title: 'Ship it?' } },
    };
    const conversations = [
      { _id: 'conv1', identifier: 'conv_bob' },
      { _id: 'conv2', identifier: 'conv_carol' },
    ];
    const answerRow = (fields: Record<string, unknown>, answer: Record<string, unknown>) =>
      row({
        type: ConversationActivityTypeEnum.HUMAN_INTERACTION_RESPONSE,
        senderId: 'carol',
        senderName: 'Carol',
        ...fields,
        richContent: { humanInteraction: { interactionIdentifier: 'hi_ship', kind: 'approve', ...answer } },
      });

    it('gives the answer in the conversation the question was asked in, from whoever pressed, and leaves out its copy', async () => {
      const own = answerRow(
        { identifier: 'human:hi_ship:response' },
        { status: 'approved', optionId: 'approve', answeredElsewhere: true }
      );
      const copy = answerRow(
        { identifier: 'human:hi_ship:conv2:response', _conversationId: 'conv2' },
        { status: 'approved', optionId: 'approve' }
      );
      const { service } = setup({ rows: [own, copy], cards: [SHIP_IT], conversations });

      const page = await service.read(scope, agent, listenedTo, { at: now.getTime() - 120_000 }, 20, now);

      expect(page.data).to.have.length(1);
      expect(page.data[0]).to.deep.include({
        id: 'human:hi_ship:response',
        conversationId: 'conv_bob',
        from: { id: 'carol', name: 'Carol', isOperator: false },
        text: 'Approved',
        answersMessageId: 'hi_ship',
        answer: { status: 'approved', optionId: 'approve' },
      });
    });

    it('gives words answered in another conversation from the row in the question’s own, not the reply where they were written', async () => {
      const ask = { ...SHIP_IT, identifier: 'hi_env', kind: HumanInteractionKindEnum.ASK };
      const reply = row({ _conversationId: 'conv2', senderId: 'bob', content: 'prod' });
      const own = row({
        type: ConversationActivityTypeEnum.HUMAN_INTERACTION_RESPONSE,
        identifier: 'human:hi_env:response',
        senderId: 'bob',
        richContent: {
          humanInteraction: {
            interactionIdentifier: 'hi_env',
            kind: 'ask',
            status: 'answered',
            text: 'prod',
            answeredElsewhere: true,
          },
        },
      });
      const { service } = setup({
        rows: [reply, own],
        cards: [ask],
        conversations,
        questions: [
          {
            identifier: 'hi_env',
            _conversationId: 'conv1',
            createdAt: new Date(now.getTime() - 10 * 60_000),
            response: {
              type: 'text',
              text: 'prod',
              respondedBySubscriberId: 'bob',
              respondedAt: new Date(reply.createdAt.getTime() + 300).toISOString(),
            },
          },
        ],
      });

      const page = await service.read(scope, agent, listenedTo, { at: now.getTime() - 120_000 }, 20, now);

      expect(page.data).to.have.length(1);
      expect(page.data[0]).to.deep.include({
        id: 'human:hi_env:response',
        conversationId: 'conv_bob',
        from: { id: 'bob', name: 'Bob', isOperator: false },
        text: 'prod',
        answersMessageId: 'hi_env',
        answer: { status: 'answered', text: 'prod' },
      });
    });

    it('leaves out an answer the agent already read, pressed or written', async () => {
      const read = '2026-10-24T11:59:00.000Z';
      const pressed = answerRow({ identifier: 'human:hi_ship:response' }, { status: 'approved', optionId: 'approve' });
      const reply = row({ content: 'staging' });
      const { service } = setup({
        rows: [pressed, reply],
        cards: [{ ...SHIP_IT, answerReadAt: read }],
        conversations,
        questions: [
          {
            identifier: 'hi_env',
            _conversationId: 'conv1',
            createdAt: new Date(now.getTime() - 10 * 60_000),
            answerReadAt: read,
            response: {
              type: 'text',
              text: 'staging',
              respondedBySubscriberId: 'ada',
              respondedAt: new Date(reply.createdAt.getTime() + 300).toISOString(),
            },
          },
        ],
      });

      const page = await service.read(scope, agent, listenedTo, { at: now.getTime() - 120_000 }, 20, now);

      expect(page.data).to.deep.equal([]);
    });
  });

  it('marks a reply that answered a question, and leaves out the answer row of that question', async () => {
    const reply = row({ content: ' staging ' });
    const answerRow = row({
      type: ConversationActivityTypeEnum.HUMAN_INTERACTION_RESPONSE,
      richContent: { humanInteraction: { interactionIdentifier: 'hi_ask', kind: 'ask', status: 'answered' } },
    });
    const { service } = setup({
      rows: [reply, answerRow],
      questions: [
        {
          identifier: 'hi_ask',
          createdAt: new Date(now.getTime() - 10 * 60_000),
          response: {
            type: 'text',
            text: 'staging',
            respondedBySubscriberId: 'ada',
            respondedAt: new Date(reply.createdAt.getTime() + 300).toISOString(),
          },
        },
      ],
    });

    const page = await service.read(scope, agent, listenedTo, { at: now.getTime() - 120_000 }, 20, now);

    expect(page.data).to.have.length(1);
    expect(page.data[0]).to.deep.include({
      id: reply.identifier,
      text: ' staging ',
      answersMessageId: 'hi_ask',
      answer: { status: 'answered', text: 'staging' },
    });
  });

  it('gives the answer written in the question’s own conversation by someone it doesn’t listen to, whose message it doesn’t read', async () => {
    // Carol answers in the group the question was asked in; her own message isn't among the rows it reads.
    const answerRow = row({
      type: ConversationActivityTypeEnum.HUMAN_INTERACTION_RESPONSE,
      identifier: 'human:hi_env:response',
      senderId: 'carol',
      senderName: 'Carol',
      richContent: {
        humanInteraction: { interactionIdentifier: 'hi_env', kind: 'ask', status: 'answered', text: 'prod' },
      },
    });
    const { service } = setup({
      rows: [answerRow],
      cards: [{ identifier: 'hi_env', kind: HumanInteractionKindEnum.ASK, _conversationId: 'conv1' }],
    });

    const page = await service.read(scope, agent, listenedTo, { at: now.getTime() - 120_000 }, 20, now);

    expect(page.data).to.have.length(1);
    expect(page.data[0]).to.deep.include({
      id: 'human:hi_env:response',
      conversationId: 'conv_one',
      from: { id: 'carol', name: 'Carol', isOperator: false },
      text: 'prod',
      answersMessageId: 'hi_env',
      answer: { status: 'answered', text: 'prod' },
    });
  });

  it('gives a question to the earliest reply that fits, even one an earlier look gave', async () => {
    const first = row({ content: 'yes', createdAt: new Date(now.getTime() - 30_000) });
    const again = row({ content: 'yes', createdAt: new Date(now.getTime() - 28_000) });
    const { service } = setup({
      rows: [again],
      earlier: [first],
      questions: [
        {
          identifier: 'hi_yes',
          createdAt: new Date(now.getTime() - 10 * 60_000),
          response: {
            type: 'text',
            text: 'yes',
            respondedBySubscriberId: 'ada',
            respondedAt: new Date(first.createdAt.getTime() + 300).toISOString(),
          },
        },
      ],
    });

    const page = await service.read(scope, agent, listenedTo, { at: first.createdAt.getTime() }, 20, now);

    expect(page.data).to.have.length(1);
    expect(page.data[0]).to.not.have.property('answersMessageId');
  });

  it('marks a reply to a question whoever answered it, also someone it wasn’t sent to', async () => {
    const { service, humanInteractionRepository } = setup({ rows: [row({ senderId: 'bob', content: 'staging' })] });

    await service.read(scope, agent, listenedTo, { at: now.getTime() - 120_000 }, 20, now);

    const query = humanInteractionRepository.find
      .getCalls()
      .map((call) => call.args[0])
      .find((args) => args.kind);
    expect(query).to.not.have.property('subscriberIds');
    expect(query['response.respondedBySubscriberId']).to.deep.equal({ $in: ['bob'] });
  });

  it('gives a pressed button as the answer to its card, saying what the button says', async () => {
    const approved = row({
      type: ConversationActivityTypeEnum.HUMAN_INTERACTION_RESPONSE,
      identifier: 'human:hi_approve:response',
      richContent: {
        humanInteraction: {
          interactionIdentifier: 'hi_approve',
          kind: 'approve',
          status: 'approved',
          optionId: 'approve',
        },
      },
    });
    const picked = row({
      type: ConversationActivityTypeEnum.HUMAN_INTERACTION_RESPONSE,
      identifier: 'human:hi_choose:response',
      senderId: 'bob',
      richContent: {
        humanInteraction: { interactionIdentifier: 'hi_choose', kind: 'choose', status: 'answered', optionId: 'opt_2' },
      },
    });
    const expired = row({
      type: ConversationActivityTypeEnum.HUMAN_INTERACTION_RESPONSE,
      richContent: { humanInteraction: { interactionIdentifier: 'hi_gone', kind: 'approve', status: 'expired' } },
    });
    const { service } = setup({
      rows: [approved, picked, expired],
      cards: [
        {
          identifier: 'hi_choose',
          kind: HumanInteractionKindEnum.CHOOSE,
          content: {
            cardChrome: {
              title: 'Release strategy?',
              options: [
                { id: 'opt_1', label: 'Canary' },
                { id: 'opt_2', label: 'Blue-green' },
              ],
            },
          },
        },
      ],
    });

    const page = await service.read(scope, agent, listenedTo, { at: now.getTime() - 120_000 }, 20, now);

    expect(
      page.data.map(({ id, text, answersMessageId, answer, from }) => ({
        id,
        text,
        answersMessageId,
        answer,
        from: from.id,
      }))
    ).to.deep.equal([
      {
        id: 'human:hi_approve:response',
        text: 'Approved',
        answersMessageId: 'hi_approve',
        answer: { status: 'approved', optionId: 'approve' },
        from: 'ada',
      },
      {
        id: 'human:hi_choose:response',
        text: 'Blue-green',
        answersMessageId: 'hi_choose',
        answer: { status: 'answered', optionId: 'opt_2' },
        from: 'bob',
      },
    ]);
  });

  it('says how many times the conversation was resolved before each message, and whether it is a direct chat', async () => {
    const before = row({ content: 'first matter' });
    const resolvedAt = new Date(before.createdAt.getTime() + 5);
    const after = row({ content: 'a new matter', createdAt: new Date(resolvedAt.getTime() + 5) });
    const inGroup = row({ _conversationId: 'conv2', content: 'in the group' });
    const { service } = setup({
      rows: [before, after, inGroup],
      resolves: [{ _id: '6720aa0b1c2d3e4f5a6b9999', _conversationId: 'conv1', createdAt: resolvedAt }],
      conversations: [
        { _id: 'conv1', identifier: 'conv_one' },
        { _id: 'conv2', identifier: 'conv_two', isDirectMessage: false },
      ],
    });

    const page = await service.read(scope, agent, listenedTo, { at: now.getTime() - 120_000 }, 20, now);

    expect(page.data.map(({ text, round, isDirectMessage }) => ({ text, round, isDirectMessage }))).to.deep.equal([
      { text: 'first matter', round: 0, isDirectMessage: true },
      { text: 'a new matter', round: 1, isDirectMessage: true },
      { text: 'in the group', round: 0, isDirectMessage: false },
    ]);
  });

  it('gives what came with a message as the inbox shows it', async () => {
    const photo = row({
      content: '',
      richContent: {
        attachments: [
          { type: 'image', name: 'error.png', mimeType: 'image/png', size: 2048, storageKey: 'secret/key' },
        ],
      },
    });
    const { service } = setup({ rows: [photo] });

    const page = await service.read(scope, agent, listenedTo, { at: now.getTime() - 120_000 }, 20, now);

    expect(page.data[0]).to.deep.include({
      text: '',
      attachments: [{ type: 'image', name: 'error.png', mimeType: 'image/png', size: 2048 }],
    });
  });

  it('says there is more to read when it read all the rows one look takes', async () => {
    // Deleted messages only: nothing counts, but the cursor moves past them all.
    const rows = Array.from({ length: 200 }, (_, index) => row({ platformMessageId: `tg-${index}` }));
    const { service } = setup({
      rows,
      revisions: rows.map((deleted) => ({
        _conversationId: 'conv1',
        platformMessageId: deleted.platformMessageId,
        type: ConversationActivityTypeEnum.DELETE,
      })),
    });

    const page = await service.read(scope, agent, listenedTo, { at: now.getTime() - 120_000 }, 20, now);

    expect(page.data).to.have.length(0);
    expect(page.more).to.equal(true);
    expect(page.next).to.deep.equal({ at: rows[199].createdAt.getTime(), id: rows[199]._id });
  });

  describe('matchAnswers', () => {
    const at = Date.parse('2026-10-24T11:00:00.000Z');
    const message = (id: string, senderId: string, content: string, offset = 0) => ({
      _id: id,
      senderId,
      content,
      createdAt: new Date(at + offset).toISOString(),
    });
    const question = (
      identifier: string,
      text: string,
      respondedBySubscriberId: string,
      offset: number,
      askedOffset = -60_000
    ) => ({
      identifier,
      createdAt: new Date(at + askedOffset).toISOString(),
      response: {
        type: 'text' as const,
        text,
        respondedBySubscriberId,
        respondedAt: new Date(at + offset).toISOString(),
      },
    });

    it('pairs a reply with the question its sender settled with the same words moments later', () => {
      const staging = question('hi_1', 'staging', 'ada', 400);

      expect(
        matchAnswers([message('m1', 'ada', 'staging'), message('m2', 'ada', 'thanks', 1000)], [staging])
      ).to.deep.equal(new Map([['m1', staging]]));
    });

    it('pairs nothing for other words, another person, or an answer long after', () => {
      expect(matchAnswers([message('m1', 'ada', 'staging')], [question('hi_1', 'prod', 'ada', 400)]).size).to.equal(0);
      expect(matchAnswers([message('m1', 'ada', 'staging')], [question('hi_1', 'staging', 'bob', 400)]).size).to.equal(
        0
      );
      expect(
        matchAnswers([message('m1', 'ada', 'staging')], [question('hi_1', 'staging', 'ada', 10 * 60 * 1000)]).size
      ).to.equal(0);
    });

    it('gives each question to one message only, the first that fits', () => {
      const yes = question('hi_1', 'yes', 'ada', 200);

      expect(matchAnswers([message('m1', 'ada', 'yes'), message('m2', 'ada', 'yes', 500)], [yes])).to.deep.equal(
        new Map([['m1', yes]])
      );
    });

    it('gives a question to no message written before it was asked, however alike', () => {
      // "yes" about something else, then the question, then the "yes" that answers it.
      const yes = question('hi_1', 'yes', 'ada', 60_300, 30_000);

      expect(matchAnswers([message('m1', 'ada', 'yes'), message('m2', 'ada', 'yes', 60_000)], [yes])).to.deep.equal(
        new Map([['m2', yes]])
      );
    });
  });

  describe('roundOf', () => {
    const at = Date.parse('2026-10-24T11:00:00.000Z');

    it('counts the resolves before the message, and a resolve at the same moment by the order rows are read in', () => {
      const resolves = [
        { at: at - 1000, id: '6720aa0b1c2d3e4f5a6b0001' },
        { at, id: '6720aa0b1c2d3e4f5a6b0002' },
        { at, id: '6720aa0b1c2d3e4f5a6b0009' },
        { at: at + 1000, id: '6720aa0b1c2d3e4f5a6b0003' },
      ];

      expect(roundOf({ _id: '6720aa0b1c2d3e4f5a6b0005', createdAt: new Date(at).toISOString() }, resolves)).to.equal(2);
      expect(
        roundOf({ _id: '6720aa0b1c2d3e4f5a6b0005', createdAt: new Date(at - 5000).toISOString() }, resolves)
      ).to.equal(0);
      expect(roundOf({ _id: '6720aa0b1c2d3e4f5a6b0005', createdAt: new Date(at).toISOString() })).to.equal(0);
    });
  });

  describe('answerText', () => {
    it('says approved or denied for the approve card’s own buttons, and an extra action by its label', () => {
      const card = {
        kind: HumanInteractionKindEnum.APPROVE,
        content: { cardChrome: { title: 'Ship it?', extraActions: [{ id: 'later', label: 'Ask me later' }] } },
      };

      expect(
        answerText({ interactionIdentifier: 'hi', kind: 'approve', status: 'approved', optionId: 'approve' }, card)
      ).to.equal('Approved');
      expect(
        answerText({ interactionIdentifier: 'hi', kind: 'approve', status: 'denied', optionId: 'deny' }, card)
      ).to.equal('Denied');
      expect(
        answerText({ interactionIdentifier: 'hi', kind: 'approve', status: 'approved', optionId: 'later' }, card)
      ).to.equal('Ask me later');
    });

    it('falls back to the option id when the card can no longer be read', () => {
      expect(
        answerText({ interactionIdentifier: 'hi', kind: 'choose', status: 'answered', optionId: 'opt_2' })
      ).to.equal('opt_2');
    });
  });
});
