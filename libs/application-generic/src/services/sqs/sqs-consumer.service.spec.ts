import { ChangeMessageVisibilityCommand, DeleteMessageCommand, type Message } from '@aws-sdk/client-sqs';
import { JobTopicNameEnum } from '@novu/shared';
import { SqsService } from './sqs.service';
import { SqsConsumerService, SqsMessageProcessor } from './sqs-consumer.service';
import { SQS_LARGE_PAYLOAD_MARKER } from './sqs-payload-offload.service';
import { SqsRetryError } from './sqs-retry.error';

type ConsumerConfig = {
  handleMessage: (message: Message) => Promise<Message>;
};

let capturedConfig: ConsumerConfig;

jest.mock('sqs-consumer', () => ({
  Consumer: {
    create: jest.fn((config: ConsumerConfig) => {
      capturedConfig = config;

      return { on: jest.fn(), start: jest.fn(), stop: jest.fn() };
    }),
  },
}));

const VISIBILITY_TIMEOUT = 90;
const HEARTBEAT_INTERVAL_MS = (VISIBILITY_TIMEOUT * 1000) / 2;

const mockClientSend = jest.fn();
const mockMaybeResolve = jest.fn();

function buildMessage(overrides: Partial<Message> = {}): Message {
  return {
    MessageId: 'msg-1',
    ReceiptHandle: 'receipt-1',
    Body: JSON.stringify({ _id: 'job-1', _organizationId: 'org-1' }),
    Attributes: { ApproximateReceiveCount: '1', MessageGroupId: 'org-1' },
    ...overrides,
  };
}

function buildSqsService(withOffload: boolean): SqsService {
  return {
    getQueueUrl: () => 'https://sqs.eu-west-1.amazonaws.com/1/standard',
    getClient: () => ({ send: mockClientSend }),
    getPayloadOffloadService: () => (withOffload ? { maybeResolve: mockMaybeResolve } : undefined),
  } as unknown as SqsService;
}

function createConsumer(processor: SqsMessageProcessor, withOffload = false): SqsConsumerService {
  return new SqsConsumerService(JobTopicNameEnum.STANDARD, buildSqsService(withOffload), processor, undefined, {
    visibilityTimeout: VISIBILITY_TIMEOUT,
  });
}

/** Let queued microtasks run without advancing any timers. */
async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 10; i += 1) {
    // eslint-disable-next-line no-await-in-loop -- draining the microtask queue is inherently serial
    await Promise.resolve();
  }
}

function commandCalls(commandType: unknown): unknown[] {
  return mockClientSend.mock.calls
    .map(([command]) => command)
    .filter((command) => command instanceof (commandType as never));
}

describe('SqsConsumerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset so a failed createConsumer cannot leave the previous test's handler
    // in place and make the next one pass for the wrong reason.
    capturedConfig = undefined as unknown as ConsumerConfig;
    mockClientSend.mockResolvedValue({});
    mockMaybeResolve.mockImplementation(async (body: string) => body);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('visibility heartbeat ordering', () => {
    it('should have cleared the heartbeat while the delete is still in flight', async () => {
      jest.useFakeTimers();

      let finishProcessing: () => void = () => {};
      const processing = new Promise<void>((resolve) => {
        finishProcessing = resolve;
      });

      let finishDelete: () => void = () => {};
      mockClientSend.mockImplementation((command: unknown) => {
        if (command instanceof DeleteMessageCommand) {
          return new Promise((resolve) => {
            finishDelete = () => resolve({});
          });
        }

        return Promise.resolve({});
      });

      createConsumer(async () => processing);
      await capturedConfig.handleMessage(buildMessage());
      await flushMicrotasks();

      finishProcessing();
      await flushMicrotasks();

      // The delete is in flight; this is exactly the window the heartbeat used
      // to tick into and fail with "Message does not exist".
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 3);
      await flushMicrotasks();

      expect(commandCalls(ChangeMessageVisibilityCommand)).toHaveLength(0);
      expect(commandCalls(DeleteMessageCommand)).toHaveLength(1);

      finishDelete();
      await flushMicrotasks();
    });

    it('should extend visibility while the processor is still running', async () => {
      jest.useFakeTimers();

      createConsumer(async () => new Promise<void>(() => {}));
      await capturedConfig.handleMessage(buildMessage());
      await flushMicrotasks();

      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 2);
      await flushMicrotasks();

      expect(commandCalls(ChangeMessageVisibilityCommand)).toHaveLength(2);
    });
  });

  describe('retry backoff', () => {
    it('should shorten visibility to the requested delay on SqsRetryError', async () => {
      createConsumer(async () => {
        throw new SqsRetryError(new Error('webhook filter failed'), 4_000);
      });

      await capturedConfig.handleMessage(buildMessage());
      await flushMicrotasks();

      const [command] = commandCalls(ChangeMessageVisibilityCommand) as ChangeMessageVisibilityCommand[];
      expect(command.input.VisibilityTimeout).toBe(4);
      expect(commandCalls(DeleteMessageCommand)).toHaveLength(0);
    });

    it('should leave visibility untouched for a plain failure', async () => {
      createConsumer(async () => {
        throw new Error('boom');
      });

      await capturedConfig.handleMessage(buildMessage());
      await flushMicrotasks();

      expect(commandCalls(ChangeMessageVisibilityCommand)).toHaveLength(0);
      expect(commandCalls(DeleteMessageCommand)).toHaveLength(0);
    });
  });

  describe('offloaded payloads', () => {
    it('should fail rather than hand an unresolved S3 pointer to the processor', async () => {
      const processor = jest.fn();
      const pointer = JSON.stringify({ [SQS_LARGE_PAYLOAD_MARKER]: { bucket: 'b', key: 'k' } });
      // A consumer without the bucket configured returns the body untouched.
      mockMaybeResolve.mockImplementation(async (body: string) => body);

      createConsumer(processor, true);
      await capturedConfig.handleMessage(buildMessage({ Body: pointer }));
      await flushMicrotasks();

      expect(processor).not.toHaveBeenCalled();
      // Not deleted, so SQS redelivers and the message eventually reaches the DLQ.
      expect(commandCalls(DeleteMessageCommand)).toHaveLength(0);
    });

    it('should process a pointer that resolves successfully', async () => {
      const processor = jest.fn().mockResolvedValue(undefined);
      const pointer = JSON.stringify({ [SQS_LARGE_PAYLOAD_MARKER]: { bucket: 'b', key: 'k' } });
      mockMaybeResolve.mockResolvedValue(JSON.stringify({ _id: 'job-1' }));

      createConsumer(processor, true);
      await capturedConfig.handleMessage(buildMessage({ Body: pointer }));
      await flushMicrotasks();

      expect(processor).toHaveBeenCalledWith({ _id: 'job-1' }, { messageId: 'msg-1', receiveCount: 1 });
      expect(commandCalls(DeleteMessageCommand)).toHaveLength(1);
    });
  });
});
