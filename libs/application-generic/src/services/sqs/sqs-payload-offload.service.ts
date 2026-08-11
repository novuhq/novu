import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Logger } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { Readable } from 'stream';

import { SQS_DEFAULT_PAYLOAD_SIZE_THRESHOLD } from './types';

const LOG_CONTEXT = 'SqsPayloadOffloadService';

export const SQS_LARGE_PAYLOAD_MARKER = '__sqsLargePayload';
/** Prefix under which this service writes every offloaded payload. */
export const SQS_PAYLOAD_KEY_PREFIX = 'sqs-payloads/';

interface ISqsLargePayloadReference {
  [SQS_LARGE_PAYLOAD_MARKER]: {
    bucket: string;
    key: string;
  };
}

export class SqsPayloadOffloadService {
  private s3Client?: S3Client;
  private readonly bucket: string | undefined;
  private readonly threshold: number;

  constructor(region: string, endpoint?: string) {
    this.bucket = process.env.SQS_PAYLOAD_OFFLOAD_BUCKET;
    this.threshold = process.env.SQS_PAYLOAD_SIZE_THRESHOLD
      ? Number(process.env.SQS_PAYLOAD_SIZE_THRESHOLD)
      : SQS_DEFAULT_PAYLOAD_SIZE_THRESHOLD;

    if (this.bucket) {
      const config: Record<string, unknown> = { region };
      if (endpoint) {
        config.endpoint = endpoint;
        config.forcePathStyle = true;
      }

      this.s3Client = new S3Client(config);

      Logger.log(
        { bucket: this.bucket, thresholdBytes: this.threshold },
        'SQS payload offload to S3 enabled',
        LOG_CONTEXT
      );
    }
  }

  isConfigured(): boolean {
    return !!this.bucket && !!this.s3Client;
  }

  async maybeOffload(body: string, topic: string, messageId: string, groupId: string): Promise<string> {
    if (!this.s3Client || !this.bucket) {
      return body;
    }

    const sizeBytes = Buffer.byteLength(body, 'utf8');
    if (sizeBytes <= this.threshold) {
      return body;
    }

    const key = this.buildS3Key(topic, groupId, messageId);

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: 'application/json',
      })
    );

    Logger.log({ topic, messageId, groupId, sizeBytes, key }, 'Large SQS payload offloaded to S3', LOG_CONTEXT);

    const reference: ISqsLargePayloadReference = {
      [SQS_LARGE_PAYLOAD_MARKER]: { bucket: this.bucket, key },
    };

    return JSON.stringify(reference);
  }

  async maybeResolve(body: string): Promise<string> {
    if (!this.s3Client || !this.bucket || !body) {
      return body;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      return body;
    }

    if (!this.isLargePayloadReference(parsed)) {
      return body;
    }

    const { bucket, key } = (parsed as ISqsLargePayloadReference)[SQS_LARGE_PAYLOAD_MARKER];

    /*
     * The reference arrives in the (untrusted) SQS message body. Never fetch
     * from the bucket the message names: honoring it would let anyone able to
     * influence a message body point the worker at an arbitrary S3 bucket -
     * reading objects the worker's IAM role can access (SSRF-style
     * exfiltration) or injecting a crafted job payload from a bucket the
     * attacker controls. Only the configured offload bucket this service
     * writes to is trusted, and only keys under its own producer prefix.
     */
    if (bucket !== this.bucket) {
      Logger.error(
        { referencedBucket: bucket, configuredBucket: this.bucket, key },
        'Rejected SQS offloaded payload reference: bucket does not match the configured offload bucket',
        LOG_CONTEXT
      );

      throw new Error('Refusing to resolve SQS offloaded payload from an untrusted bucket');
    }

    if (!key.startsWith(SQS_PAYLOAD_KEY_PREFIX)) {
      Logger.error(
        { bucket, key, expectedPrefix: SQS_PAYLOAD_KEY_PREFIX },
        'Rejected SQS offloaded payload reference: key is outside the offload prefix',
        LOG_CONTEXT
      );

      throw new Error('Refusing to resolve SQS offloaded payload outside the offload key prefix');
    }

    const response = await this.s3Client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));

    const resolved = await this.streamToString(response.Body as Readable);

    Logger.debug({ bucket, key }, 'Resolved large SQS payload from S3', LOG_CONTEXT);

    return resolved;
  }

  private isLargePayloadReference(data: unknown): data is ISqsLargePayloadReference {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    const ref = (data as Record<string, unknown>)[SQS_LARGE_PAYLOAD_MARKER];
    if (typeof ref !== 'object' || ref === null) {
      return false;
    }

    const { bucket, key } = ref as Record<string, unknown>;

    return typeof bucket === 'string' && typeof key === 'string';
  }

  private buildS3Key(topic: string, groupId: string, messageId: string): string {
    const date = new Date().toISOString().slice(0, 10);
    const id = nanoid();

    return `${SQS_PAYLOAD_KEY_PREFIX}${topic}/${groupId}/${date}/${messageId}-${id}.json`;
  }

  private async streamToString(stream: Readable): Promise<string> {
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
  }
}
