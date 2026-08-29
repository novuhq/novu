import { JobTopicNameEnum } from '@novu/shared';
import { packMessagesIntoBatches, SqsService } from './sqs.service';
import { SqsPartialSendError } from './sqs-partial-send.error';
import { ISqsMessage, SQS_BATCH_BYTE_BUDGET, SQS_MAX_BATCH_ENTRIES } from './types';

const mockProducerSend = jest.fn();

jest.mock('sqs-producer', () => ({
  Producer: {
    create: jest.fn(() => ({ send: mockProducerSend })),
  },
}));

jest.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: jest.fn(() => ({ destroy: jest.fn() })),
}));

const TOPIC = JobTopicNameEnum.STANDARD;

function buildMessage(id: string, bodyBytes = 10): ISqsMessage {
  return {
    id,
    body: 'x'.repeat(bodyBytes),
    groupId: 'org-123',
  };
}

/** Run a bulk send that is expected to fail, returning the partial-send error. */
async function capturePartialSendError(send: Promise<void>): Promise<SqsPartialSendError> {
  try {
    await send;
  } catch (error) {
    return error as SqsPartialSendError;
  }

  throw new Error('Expected sendBulk to reject with SqsPartialSendError');
}

/** Total wire size of a group, matching what the packer budgets against. */
function groupBytes(group: ISqsMessage[]): number {
  return group.reduce(
    (total, message) =>
      total +
      Buffer.byteLength(message.body, 'utf8') +
      Buffer.byteLength(message.id, 'utf8') +
      Buffer.byteLength(message.groupId, 'utf8'),
    0
  );
}

describe('packMessagesIntoBatches', () => {
  it('should keep a small set in a single batch', () => {
    const groups = packMessagesIntoBatches(Array.from({ length: 10 }, (_, i) => buildMessage(`m-${i}`)));

    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(10);
  });

  it('should never exceed the entry limit', () => {
    const groups = packMessagesIntoBatches(Array.from({ length: 25 }, (_, i) => buildMessage(`m-${i}`)));

    expect(groups).toHaveLength(3);
    for (const group of groups) {
      expect(group.length).toBeLessThanOrEqual(SQS_MAX_BATCH_ENTRIES);
    }
  });

  it('should split by bytes before reaching the entry limit', () => {
    // 148 KB each: the size that produced BatchRequestTooLong in production.
    const messages = Array.from({ length: 13 }, (_, i) => buildMessage(`m-${i}`, 148 * 1024));

    const groups = packMessagesIntoBatches(messages);

    expect(groups.length).toBeGreaterThan(1);
    expect(groups.flat()).toHaveLength(13);
    for (const group of groups) {
      expect(group.length).toBeLessThan(SQS_MAX_BATCH_ENTRIES);
      expect(groupBytes(group)).toBeLessThanOrEqual(SQS_BATCH_BYTE_BUDGET);
    }
  });

  it('should give a message larger than the budget its own batch rather than throwing', () => {
    const messages = [
      buildMessage('small-1'),
      buildMessage('huge', SQS_BATCH_BYTE_BUDGET + 1_000),
      buildMessage('small-2'),
    ];

    const groups = packMessagesIntoBatches(messages);

    expect(groups).toHaveLength(3);
    expect(groups[1].map((m) => m.id)).toEqual(['huge']);
  });

  it('should return no batches for an empty input', () => {
    expect(packMessagesIntoBatches([])).toEqual([]);
  });
});

describe('SqsService.sendBulk', () => {
  let service: SqsService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SQS_QUEUE_URL_STANDARD = 'https://sqs.eu-west-1.amazonaws.com/1/standard';
    mockProducerSend.mockResolvedValue([]);
    service = new SqsService();
  });

  afterEach(() => {
    delete process.env.SQS_QUEUE_URL_STANDARD;
  });

  it('should issue one producer call per batch', async () => {
    await service.sendBulk(
      TOPIC,
      Array.from({ length: 25 }, (_, i) => buildMessage(`m-${i}`))
    );

    expect(mockProducerSend).toHaveBeenCalledTimes(3);
    for (const [group] of mockProducerSend.mock.calls) {
      expect(group.length).toBeLessThanOrEqual(SQS_MAX_BATCH_ENTRIES);
    }
  });

  it('should keep every batch inside the byte budget', async () => {
    await service.sendBulk(
      TOPIC,
      Array.from({ length: 13 }, (_, i) => buildMessage(`m-${i}`, 148 * 1024))
    );

    expect(mockProducerSend.mock.calls.length).toBeGreaterThan(1);
    for (const [group] of mockProducerSend.mock.calls) {
      expect(groupBytes(group)).toBeLessThanOrEqual(SQS_BATCH_BYTE_BUDGET);
    }
  });

  it('should report the untried batches as unsent when a batch throws', async () => {
    const messages = Array.from({ length: 25 }, (_, i) => buildMessage(`m-${i}`));
    mockProducerSend.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('BatchRequestTooLong'));

    await expect(service.sendBulk(TOPIC, messages)).rejects.toBeInstanceOf(SqsPartialSendError);

    // The third batch is never attempted once the second fails.
    expect(mockProducerSend).toHaveBeenCalledTimes(2);
  });

  it('should carry exactly the undelivered messages on a thrown batch', async () => {
    const messages = Array.from({ length: 25 }, (_, i) => buildMessage(`m-${i}`));
    mockProducerSend.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('BatchRequestTooLong'));

    const error = await capturePartialSendError(service.sendBulk(TOPIC, messages));

    expect(error.sentCount).toBe(10);
    expect(error.unsentMessages.map((m) => m.id)).toEqual(messages.slice(10).map((m) => m.id));
  });

  it('should only report the named entries when the batch call reports per-entry failures', async () => {
    const messages = Array.from({ length: 5 }, (_, i) => buildMessage(`m-${i}`));
    // Shape of sqs-producer's FailedMessagesError, which is not exported.
    const failure = Object.assign(new Error('Failed to send messages: m-1, m-3'), {
      failedMessages: ['m-1', 'm-3'],
    });
    mockProducerSend.mockRejectedValueOnce(failure);

    const error = await capturePartialSendError(service.sendBulk(TOPIC, messages));

    expect(error.unsentMessages.map((m) => m.id)).toEqual(['m-1', 'm-3']);
    expect(error.sentCount).toBe(3);
  });

  it('should treat the whole group as unsent when the failure names no entries', async () => {
    const messages = Array.from({ length: 5 }, (_, i) => buildMessage(`m-${i}`));
    // An empty list must not be read as "every entry succeeded".
    mockProducerSend.mockRejectedValueOnce(
      Object.assign(new Error('Failed to send messages: '), { failedMessages: [] })
    );

    const error = await capturePartialSendError(service.sendBulk(TOPIC, messages));

    expect(error.unsentMessages).toHaveLength(5);
    expect(error.sentCount).toBe(0);
  });

  it('should resolve without error when every batch succeeds', async () => {
    await expect(
      service.sendBulk(
        TOPIC,
        Array.from({ length: 12 }, (_, i) => buildMessage(`m-${i}`))
      )
    ).resolves.toBeUndefined();
  });
});
