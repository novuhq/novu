import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

import { SqsPayloadOffloadService } from './sqs-payload-offload.service';
import { SQS_DEFAULT_PAYLOAD_SIZE_THRESHOLD } from './types';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');

  return {
    ...actual,
    S3Client: jest.fn(() => ({ send: mockSend })),
  };
});

function createReadableFromString(str: string): Readable {
  const stream = new Readable();
  stream.push(str);
  stream.push(null);

  return stream;
}

describe('SqsPayloadOffloadService', () => {
  const BUCKET = 'test-offload-bucket';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SQS_PAYLOAD_OFFLOAD_BUCKET = BUCKET;
    delete process.env.SQS_PAYLOAD_SIZE_THRESHOLD;
  });

  afterEach(() => {
    delete process.env.SQS_PAYLOAD_OFFLOAD_BUCKET;
    delete process.env.SQS_PAYLOAD_SIZE_THRESHOLD;
  });

  describe('isConfigured', () => {
    it('should return true when bucket env var is set', () => {
      const service = new SqsPayloadOffloadService('us-east-1');

      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when bucket env var is not set', () => {
      delete process.env.SQS_PAYLOAD_OFFLOAD_BUCKET;
      const service = new SqsPayloadOffloadService('us-east-1');

      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('maybeOffload', () => {
    it('should return body as-is when under threshold', async () => {
      const service = new SqsPayloadOffloadService('us-east-1');
      const smallBody = JSON.stringify({ hello: 'world' });

      const result = await service.maybeOffload(smallBody, 'standard', 'msg-1', 'org-123');

      expect(result).toBe(smallBody);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should upload to S3 and return reference when over threshold', async () => {
      process.env.SQS_PAYLOAD_SIZE_THRESHOLD = '100';
      const service = new SqsPayloadOffloadService('us-east-1');
      const largeBody = 'x'.repeat(200);

      mockSend.mockResolvedValueOnce({});

      const result = await service.maybeOffload(largeBody, 'standard', 'msg-1', 'org-123');

      expect(mockSend).toHaveBeenCalledTimes(1);

      const putCall = mockSend.mock.calls[0][0];
      expect(putCall).toBeInstanceOf(PutObjectCommand);
      expect(putCall.input.Bucket).toBe(BUCKET);
      expect(putCall.input.Key).toMatch(/^sqs-payloads\/standard\/org-123\/\d{4}-\d{2}-\d{2}\/msg-1-.+\.json$/);
      expect(putCall.input.Body).toBe(largeBody);
      expect(putCall.input.ContentType).toBe('application/json');

      const parsed = JSON.parse(result);
      expect(parsed.__sqsLargePayload).toBeDefined();
      expect(parsed.__sqsLargePayload.bucket).toBe(BUCKET);
      expect(parsed.__sqsLargePayload.key).toMatch(/^sqs-payloads\/standard\/org-123\//);
    });

    it('should return body as-is when offloading is not configured', async () => {
      delete process.env.SQS_PAYLOAD_OFFLOAD_BUCKET;
      const service = new SqsPayloadOffloadService('us-east-1');
      const body = 'x'.repeat(2_000_000);

      const result = await service.maybeOffload(body, 'standard', 'msg-1', 'org-123');

      expect(result).toBe(body);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should use default threshold when env var is not set', async () => {
      const service = new SqsPayloadOffloadService('us-east-1');
      const justUnderThreshold = 'x'.repeat(SQS_DEFAULT_PAYLOAD_SIZE_THRESHOLD);

      const result = await service.maybeOffload(justUnderThreshold, 'standard', 'msg-1', 'org-123');

      expect(result).toBe(justUnderThreshold);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should use custom threshold from env var', async () => {
      process.env.SQS_PAYLOAD_SIZE_THRESHOLD = '50';
      const service = new SqsPayloadOffloadService('us-east-1');

      mockSend.mockResolvedValueOnce({});

      const body = 'x'.repeat(51);
      const result = await service.maybeOffload(body, 'standard', 'msg-1', 'org-123');

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(JSON.parse(result).__sqsLargePayload).toBeDefined();
    });
  });

  describe('maybeResolve', () => {
    it('should return body as-is when it is not an S3 reference', async () => {
      const service = new SqsPayloadOffloadService('us-east-1');
      const normalBody = JSON.stringify({ data: 'test' });

      const result = await service.maybeResolve(normalBody);

      expect(result).toBe(normalBody);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should fetch from S3 when body is an S3 reference', async () => {
      const service = new SqsPayloadOffloadService('us-east-1');
      const originalPayload = JSON.stringify({ job: 'data', nested: { key: 'value' } });

      const reference = JSON.stringify({
        __sqsLargePayload: {
          bucket: BUCKET,
          key: 'sqs-payloads/standard/org-123/2026-03-17/msg-1-abc123.json',
        },
      });

      mockSend.mockResolvedValueOnce({
        Body: createReadableFromString(originalPayload),
      });

      const result = await service.maybeResolve(reference);

      expect(result).toBe(originalPayload);
      expect(mockSend).toHaveBeenCalledTimes(1);

      const getCall = mockSend.mock.calls[0][0];
      expect(getCall).toBeInstanceOf(GetObjectCommand);
      expect(getCall.input.Bucket).toBe(BUCKET);
      expect(getCall.input.Key).toBe('sqs-payloads/standard/org-123/2026-03-17/msg-1-abc123.json');
    });

    it('should return body as-is when it is not valid JSON', async () => {
      const service = new SqsPayloadOffloadService('us-east-1');

      const result = await service.maybeResolve('not-json');

      expect(result).toBe('not-json');
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should return body as-is when offloading is not configured', async () => {
      delete process.env.SQS_PAYLOAD_OFFLOAD_BUCKET;
      const service = new SqsPayloadOffloadService('us-east-1');

      const reference = JSON.stringify({
        __sqsLargePayload: { bucket: BUCKET, key: 'some-key' },
      });

      const result = await service.maybeResolve(reference);

      expect(result).toBe(reference);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should return body as-is when reference has invalid structure', async () => {
      const service = new SqsPayloadOffloadService('us-east-1');

      const invalid = JSON.stringify({ __sqsLargePayload: { bucket: 123, key: null } });
      const result = await service.maybeResolve(invalid);

      expect(result).toBe(invalid);
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('round-trip', () => {
    it('should offload and resolve back to the original payload', async () => {
      process.env.SQS_PAYLOAD_SIZE_THRESHOLD = '50';
      const service = new SqsPayloadOffloadService('us-east-1');

      const originalBody = JSON.stringify({ largeData: 'x'.repeat(100) });

      mockSend.mockResolvedValueOnce({});

      const offloaded = await service.maybeOffload(originalBody, 'workflow', 'job-0', 'org-456');

      expect(JSON.parse(offloaded).__sqsLargePayload).toBeDefined();

      mockSend.mockResolvedValueOnce({
        Body: createReadableFromString(originalBody),
      });

      const resolved = await service.maybeResolve(offloaded);

      expect(resolved).toBe(originalBody);
      expect(JSON.parse(resolved)).toEqual(JSON.parse(originalBody));
    });
  });

  describe('S3 key format', () => {
    it('should generate key with correct structure', async () => {
      process.env.SQS_PAYLOAD_SIZE_THRESHOLD = '10';
      const service = new SqsPayloadOffloadService('us-east-1');

      mockSend.mockResolvedValueOnce({});

      await service.maybeOffload('x'.repeat(20), 'process-subscriber', 'msg-42', 'org-789');

      const putCall = mockSend.mock.calls[0][0];
      const key: string = putCall.input.Key;
      const parts = key.split('/');

      expect(parts[0]).toBe('sqs-payloads');
      expect(parts[1]).toBe('process-subscriber');
      expect(parts[2]).toBe('org-789');
      expect(parts[3]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(parts[4]).toMatch(/^msg-42-.+\.json$/);
    });
  });

  describe('constructor', () => {
    it('should pass endpoint and forcePathStyle for local development', () => {
      const service = new SqsPayloadOffloadService('us-east-1', 'http://localhost:4566');

      expect(service.isConfigured()).toBe(true);
      expect(S3Client).toHaveBeenCalledWith({
        region: 'us-east-1',
        endpoint: 'http://localhost:4566',
        forcePathStyle: true,
      });
    });

    it('should not pass endpoint when not provided', () => {
      const service = new SqsPayloadOffloadService('us-east-1');

      expect(service.isConfigured()).toBe(true);
      expect(S3Client).toHaveBeenCalledWith({ region: 'us-east-1' });
    });
  });
});
