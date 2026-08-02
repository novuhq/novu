import { CommunityOrganizationRepository } from '@novu/dal';
import { FeatureFlagsKeysEnum, JobTopicNameEnum, QueueBackendMode } from '@novu/shared';
import { PinoLogger } from '../../logging';
import { BullMqService } from '../bull-mq';
import { FeatureFlagsService } from '../feature-flags';
import { SqsService } from '../sqs';
import { QueueBaseService } from './queue-base.service';

const createQueueMock = jest.fn();
const addToBullMqMock = jest.fn().mockResolvedValue(undefined);
const addBulkToBullMqMock = jest.fn().mockResolvedValue(undefined);

const sendToSqsMock = jest.fn().mockResolvedValue(undefined);
const sendBulkToSqsMock = jest.fn().mockResolvedValue(undefined);

const getFlagMock = jest.fn().mockResolvedValue(QueueBackendMode.BULLMQ);

const findOneOrgMock = jest.fn();

const mockBullMqService = {
  createQueue: createQueueMock,
  add: addToBullMqMock,
  addBulk: addBulkToBullMqMock,
} as unknown as BullMqService;

const mockSqsService = {
  send: sendToSqsMock,
  sendBulk: sendBulkToSqsMock,
} as unknown as SqsService;

const mockFeatureFlagsService = {
  getFlag: getFlagMock,
} as unknown as FeatureFlagsService;

const mockOrganizationRepository = {
  findOne: findOneOrgMock,
} as unknown as CommunityOrganizationRepository;

const mockLogger = {
  setContext: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as PinoLogger;

describe('QueueBaseService - organization lookup failure handling', () => {
  let service: QueueBaseService;

  const organizationId = 'organization-id';
  const job = {
    name: 'test-job',
    data: { _id: 'job-id' },
    groupId: organizationId,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getFlagMock.mockResolvedValue(QueueBackendMode.BULLMQ);

    service = new QueueBaseService(
      JobTopicNameEnum.WEB_SOCKETS,
      mockBullMqService,
      mockSqsService,
      mockFeatureFlagsService,
      mockOrganizationRepository,
      mockLogger
    );
  });

  describe('Transient lookup failure falls back to BullMQ (regression)', () => {
    it('add() routes the job to BullMQ when the org lookup throws, instead of dropping it', async () => {
      findOneOrgMock.mockRejectedValueOnce(new Error('Mongo socket timeout'));

      await expect(service.add(job)).resolves.toBeUndefined();

      expect(findOneOrgMock).toHaveBeenCalledWith(
        { _id: organizationId },
        'apiServiceLevel',
        expect.objectContaining({ readPreference: 'primary' })
      );
      expect(sendToSqsMock).not.toHaveBeenCalled();
      expect(addToBullMqMock).toHaveBeenCalledWith(
        job.name,
        job.data,
        expect.objectContaining({ removeOnComplete: true }),
        organizationId
      );
      expect(getFlagMock).not.toHaveBeenCalled();
    });

    it('addBulk() routes the jobs to BullMQ when the org lookup throws, instead of dropping them', async () => {
      const secondJob = { name: 'test-job-2', data: { _id: 'job-id-2' }, groupId: organizationId };
      findOneOrgMock.mockRejectedValueOnce(new Error('Mongo socket timeout'));

      await expect(service.addBulk([job, secondJob])).resolves.toBeUndefined();

      expect(sendBulkToSqsMock).not.toHaveBeenCalled();
      expect(addBulkToBullMqMock).toHaveBeenCalledWith([
        expect.objectContaining({ name: job.name, data: job.data, groupId: organizationId }),
        expect.objectContaining({ name: secondJob.name, data: secondJob.data, groupId: organizationId }),
      ]);
      expect(getFlagMock).not.toHaveBeenCalled();
    });

    it('add() routes the job to BullMQ when the organization repository is unavailable', async () => {
      service = new QueueBaseService(
        JobTopicNameEnum.WEB_SOCKETS,
        mockBullMqService,
        mockSqsService,
        mockFeatureFlagsService,
        undefined,
        mockLogger
      );

      await expect(service.add(job)).resolves.toBeUndefined();

      expect(sendToSqsMock).not.toHaveBeenCalled();
      expect(addToBullMqMock).toHaveBeenCalledWith(
        job.name,
        job.data,
        expect.objectContaining({ removeOnComplete: true }),
        organizationId
      );
      expect(getFlagMock).not.toHaveBeenCalled();
    });
  });

  describe('Confirmed missing organization (primary read)', () => {
    it('uses a primary read before deciding the organization is absent and skips the job', async () => {
      findOneOrgMock.mockResolvedValueOnce(undefined);

      await expect(service.add(job)).resolves.toBeUndefined();

      expect(findOneOrgMock).toHaveBeenCalledWith(
        { _id: organizationId },
        'apiServiceLevel',
        expect.objectContaining({ readPreference: 'primary' })
      );

      expect(sendToSqsMock).not.toHaveBeenCalled();
      expect(addToBullMqMock).not.toHaveBeenCalled();
      expect(getFlagMock).not.toHaveBeenCalled();
    });
  });

  describe('Healthy path (control)', () => {
    it('add() routes the job to BullMQ when the organization is found', async () => {
      findOneOrgMock.mockResolvedValueOnce({ _id: organizationId, apiServiceLevel: 'free' });
      getFlagMock.mockResolvedValueOnce(QueueBackendMode.BULLMQ);

      await service.add(job);

      expect(addToBullMqMock).toHaveBeenCalledWith(
        job.name,
        job.data,
        expect.objectContaining({ removeOnComplete: true }),
        organizationId
      );
    });

    it('add() routes the job to SQS when the backend mode is COMPLETE', async () => {
      findOneOrgMock.mockResolvedValueOnce({ _id: organizationId, apiServiceLevel: 'free' });
      getFlagMock.mockResolvedValueOnce(QueueBackendMode.COMPLETE);

      await service.add(job);

      expect(getFlagMock).toHaveBeenCalledWith({
        key: FeatureFlagsKeysEnum.QUEUE_BACKEND_MODE,
        defaultValue: QueueBackendMode.BULLMQ,
        organization: { _id: organizationId, apiServiceLevel: 'free' },
      });

      expect(sendToSqsMock).toHaveBeenCalledWith(
        JobTopicNameEnum.WEB_SOCKETS,
        expect.objectContaining({ groupId: organizationId, body: JSON.stringify(job.data) })
      );
    });
  });
});
