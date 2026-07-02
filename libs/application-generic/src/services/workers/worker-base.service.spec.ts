import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  RequestTimeoutException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';
import { BullMqService } from '../bull-mq';
import { ISqsMessageMeta } from '../sqs';
import { isPermanentClientError, WorkerBaseService } from './worker-base.service';

class TestableWorker extends WorkerBaseService {
  constructor() {
    super(JobTopicNameEnum.WORKFLOW, {} as unknown as BullMqService);
  }

  public invokeWrapForSqs(processor: any) {
    return (this as any).wrapForSqs(processor);
  }
}

describe('isPermanentClientError', () => {
  it('returns true for BadRequestException', () => {
    expect(isPermanentClientError(new BadRequestException('bad'))).toBe(true);
  });

  it('returns true for common 4xx HttpExceptions', () => {
    expect(isPermanentClientError(new UnauthorizedException())).toBe(true);
    expect(isPermanentClientError(new ForbiddenException())).toBe(true);
    expect(isPermanentClientError(new NotFoundException())).toBe(true);
    expect(isPermanentClientError(new ConflictException())).toBe(true);
    expect(isPermanentClientError(new UnprocessableEntityException())).toBe(true);
  });

  it('returns false for transient 4xx statuses (408, 429)', () => {
    expect(isPermanentClientError(new RequestTimeoutException())).toBe(false);
    expect(isPermanentClientError(new HttpException('too many', HttpStatus.TOO_MANY_REQUESTS))).toBe(false);
  });

  it('returns false for 5xx HttpExceptions', () => {
    expect(isPermanentClientError(new InternalServerErrorException())).toBe(false);
    expect(isPermanentClientError(new HttpException('bad gateway', HttpStatus.BAD_GATEWAY))).toBe(false);
    expect(isPermanentClientError(new HttpException('unavailable', HttpStatus.SERVICE_UNAVAILABLE))).toBe(false);
  });

  it('returns false for plain Errors and non-error values', () => {
    expect(isPermanentClientError(new Error('oops'))).toBe(false);
    expect(isPermanentClientError(new TypeError('bad type'))).toBe(false);
    expect(isPermanentClientError(undefined)).toBe(false);
    expect(isPermanentClientError(null)).toBe(false);
    expect(isPermanentClientError('string')).toBe(false);
    expect(isPermanentClientError(42)).toBe(false);
  });
});

describe('WorkerBaseService.wrapForSqs', () => {
  const meta: ISqsMessageMeta = { messageId: 'msg-1', receiveCount: 1 };
  const data = { _id: 'job-1', identifier: 'workflow-1' };

  it('acks (does not throw) when processor throws a permanent client error and no failed handler is registered', async () => {
    const worker = new TestableWorker();
    const processor = jest.fn().mockRejectedValue(new BadRequestException('payload is missing required key(s)'));

    const wrapped = worker.invokeWrapForSqs(processor);

    await expect(wrapped(data, meta)).resolves.toBeUndefined();
    expect(processor).toHaveBeenCalledTimes(1);
  });

  it('rethrows (retries) when processor throws a generic error and no failed handler is registered', async () => {
    const worker = new TestableWorker();
    const processor = jest.fn().mockRejectedValue(new Error('mongo timeout'));

    const wrapped = worker.invokeWrapForSqs(processor);

    await expect(wrapped(data, meta)).rejects.toThrow('mongo timeout');
  });

  it('rethrows (retries) when processor throws a transient 4xx (408/429)', async () => {
    const worker = new TestableWorker();
    const processor = jest.fn().mockRejectedValue(new RequestTimeoutException());

    const wrapped = worker.invokeWrapForSqs(processor);

    await expect(wrapped(data, meta)).rejects.toBeInstanceOf(RequestTimeoutException);
  });

  it('defers to the registered failed handler regardless of error type when one is set', async () => {
    const worker = new TestableWorker();
    const failedHandler = jest.fn().mockResolvedValue(true);
    worker.setSqsFailedHandler(failedHandler);

    const error = new BadRequestException('payload is missing required key(s)');
    const processor = jest.fn().mockRejectedValue(error);

    const wrapped = worker.invokeWrapForSqs(processor);

    await expect(wrapped(data, meta)).rejects.toBe(error);
    expect(failedHandler).toHaveBeenCalledTimes(1);
  });

  it('acks when the registered failed handler returns false', async () => {
    const worker = new TestableWorker();
    const failedHandler = jest.fn().mockResolvedValue(false);
    worker.setSqsFailedHandler(failedHandler);

    const processor = jest.fn().mockRejectedValue(new Error('non-retryable per handler'));
    const wrapped = worker.invokeWrapForSqs(processor);

    await expect(wrapped(data, meta)).resolves.toBeUndefined();
    expect(failedHandler).toHaveBeenCalledTimes(1);
  });

  it('defaults to retry when the registered failed handler itself throws', async () => {
    const worker = new TestableWorker();
    const failedHandler = jest.fn().mockRejectedValue(new Error('handler exploded'));
    worker.setSqsFailedHandler(failedHandler);

    const error = new Error('processor failure');
    const processor = jest.fn().mockRejectedValue(error);
    const wrapped = worker.invokeWrapForSqs(processor);

    await expect(wrapped(data, meta)).rejects.toBe(error);
  });

  it('invokes the completed handler on success', async () => {
    const worker = new TestableWorker();
    const completedHandler = jest.fn().mockResolvedValue(undefined);
    worker.setSqsCompletedHandler(completedHandler);

    const processor = jest.fn().mockResolvedValue(undefined);
    const wrapped = worker.invokeWrapForSqs(processor);

    await wrapped(data, meta);
    expect(processor).toHaveBeenCalledTimes(1);
    expect(completedHandler).toHaveBeenCalledTimes(1);
  });

  it('skips processing entirely when data.skipProcessing is true', async () => {
    const worker = new TestableWorker();
    const processor = jest.fn();
    const wrapped = worker.invokeWrapForSqs(processor);

    await wrapped({ ...data, skipProcessing: true }, meta);
    expect(processor).not.toHaveBeenCalled();
  });
});
