import { Test } from '@nestjs/testing';
import { EvaluateApiRateLimit, EvaluateApiRateLimitCommand } from './index';
import { UserSession } from '@novu/testing';
import {
  ApiRateLimitAlgorithmEnum,
  ApiRateLimitCategoryEnum,
  ApiRateLimitCostEnum,
  ApiServiceLevelEnum,
  IApiRateLimitAlgorithm,
  IApiRateLimitCost,
} from '@novu/shared';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { GetApiRateLimitMaximum } from '../get-api-rate-limit-maximum';
import { GetApiRateLimitAlgorithmConfig } from '../get-api-rate-limit-algorithm-config';
import { SharedModule } from '../../../shared/shared.module';
import { RateLimitingModule } from '../../rate-limiting.module';
import { GetApiRateLimitCostConfig } from '../get-api-rate-limit-cost-config';
import { EvaluateTokenBucketRateLimit } from '../evaluate-token-bucket-rate-limit';

const mockApiRateLimitAlgorithm: IApiRateLimitAlgorithm = {
  [ApiRateLimitAlgorithmEnum.BURST_ALLOWANCE]: 0.2,
  [ApiRateLimitAlgorithmEnum.WINDOW_DURATION]: 2,
};
const mockApiRateLimitCost = ApiRateLimitCostEnum.SINGLE;
const mockApiServiceLevel = ApiServiceLevelEnum.FREE;
const mockCost = 1;
const mockApiRateLimitCostConfig: Partial<IApiRateLimitCost> = {
  [mockApiRateLimitCost]: mockCost,
};

const mockMaxLimit = 10;
const mockRemaining = 9;
const mockReset = 1;
const mockApiRateLimitCategory = ApiRateLimitCategoryEnum.GLOBAL;

describe('EvaluateApiRateLimit', async () => {
  let useCase: EvaluateApiRateLimit;
  let session: UserSession;
  let getApiRateLimitMaximum: GetApiRateLimitMaximum;
  let getApiRateLimitAlgorithmConfig: GetApiRateLimitAlgorithmConfig;
  let getApiRateLimitCostConfig: GetApiRateLimitCostConfig;
  let evaluateTokenBucketRateLimit: EvaluateTokenBucketRateLimit;

  let getApiRateLimitMaximumStub: sinon.SinonStub;
  let getApiRateLimitAlgorithmConfigStub: sinon.SinonStub;
  let getApiRateLimitCostConfigStub: sinon.SinonStub;
  let evaluateTokenBucketRateLimitStub: sinon.SinonStub;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SharedModule, RateLimitingModule],
    }).compile();

    session = new UserSession();
    await session.initialize();

    useCase = moduleRef.get<EvaluateApiRateLimit>(EvaluateApiRateLimit);
    getApiRateLimitMaximum = moduleRef.get<GetApiRateLimitMaximum>(GetApiRateLimitMaximum);
    getApiRateLimitAlgorithmConfig = moduleRef.get<GetApiRateLimitAlgorithmConfig>(GetApiRateLimitAlgorithmConfig);
    getApiRateLimitCostConfig = moduleRef.get<GetApiRateLimitCostConfig>(GetApiRateLimitCostConfig);
    evaluateTokenBucketRateLimit = moduleRef.get<EvaluateTokenBucketRateLimit>(EvaluateTokenBucketRateLimit);

    getApiRateLimitMaximumStub = sinon
      .stub(getApiRateLimitMaximum, 'execute')
      .resolves([mockMaxLimit, mockApiServiceLevel]);
    getApiRateLimitAlgorithmConfigStub = sinon
      .stub(getApiRateLimitAlgorithmConfig, 'default')
      .value(mockApiRateLimitAlgorithm);
    getApiRateLimitCostConfigStub = sinon.stub(getApiRateLimitCostConfig, 'default').value(mockApiRateLimitCostConfig);
    evaluateTokenBucketRateLimitStub = sinon.stub(evaluateTokenBucketRateLimit, 'execute').resolves({
      success: true,
      limit: mockMaxLimit,
      remaining: mockRemaining,
      reset: mockReset,
    });
  });

  afterEach(() => {
    getApiRateLimitMaximumStub.restore();
    getApiRateLimitAlgorithmConfigStub.restore();
    getApiRateLimitCostConfigStub.restore();
  });

  describe('Evaluation Values', () => {
    it('should return a boolean success value', async () => {
      const result = await useCase.execute(
        EvaluateApiRateLimitCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          apiRateLimitCategory: mockApiRateLimitCategory,
          apiRateLimitCost: mockApiRateLimitCost,
        })
      );

      expect(typeof result.success).to.equal('boolean');
    });

    it('should return a positive limit', async () => {
      const result = await useCase.execute(
        EvaluateApiRateLimitCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          apiRateLimitCategory: mockApiRateLimitCategory,
          apiRateLimitCost: mockApiRateLimitCost,
        })
      );

      expect(result.limit).to.be.greaterThan(0);
    });

    it('should return a positive remaining tokens ', async () => {
      const result = await useCase.execute(
        EvaluateApiRateLimitCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          apiRateLimitCategory: mockApiRateLimitCategory,
          apiRateLimitCost: mockApiRateLimitCost,
        })
      );

      expect(result.remaining).to.be.greaterThan(0);
    });

    it('should return a positive reset', async () => {
      const result = await useCase.execute(
        EvaluateApiRateLimitCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          apiRateLimitCategory: mockApiRateLimitCategory,
          apiRateLimitCost: mockApiRateLimitCost,
        })
      );

      expect(result.reset).to.be.greaterThan(0);
    });
  });

  describe('Static Values', () => {
    it('should return a string type algorithm value', async () => {
      const result = await useCase.execute(
        EvaluateApiRateLimitCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          apiRateLimitCategory: mockApiRateLimitCategory,
          apiRateLimitCost: mockApiRateLimitCost,
        })
      );

      expect(typeof result.algorithm).to.equal('string');
    });

    it('should return the correct window duration', async () => {
      const result = await useCase.execute(
        EvaluateApiRateLimitCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          apiRateLimitCategory: mockApiRateLimitCategory,
          apiRateLimitCost: mockApiRateLimitCost,
        })
      );

      expect(result.windowDuration).to.equal(mockApiRateLimitAlgorithm[ApiRateLimitAlgorithmEnum.WINDOW_DURATION]);
    });
  });

  describe('Computed Values', () => {
    it('should return the correct cost', async () => {
      const result = await useCase.execute(
        EvaluateApiRateLimitCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          apiRateLimitCategory: mockApiRateLimitCategory,
          apiRateLimitCost: mockApiRateLimitCost,
        })
      );

      expect(result.cost).to.equal(mockApiRateLimitCostConfig[mockApiRateLimitCost]);
    });

    it('should return the correct refill rate', async () => {
      const result = await useCase.execute(
        EvaluateApiRateLimitCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          apiRateLimitCategory: mockApiRateLimitCategory,
          apiRateLimitCost: mockApiRateLimitCost,
        })
      );

      expect(result.refillRate).to.equal(
        mockMaxLimit * mockApiRateLimitAlgorithm[ApiRateLimitAlgorithmEnum.WINDOW_DURATION]
      );
    });

    it('should return the correct burst limit', async () => {
      const result = await useCase.execute(
        EvaluateApiRateLimitCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          apiRateLimitCategory: mockApiRateLimitCategory,
          apiRateLimitCost: mockApiRateLimitCost,
        })
      );

      expect(result.burstLimit).to.equal(
        mockMaxLimit *
          mockApiRateLimitAlgorithm[ApiRateLimitAlgorithmEnum.WINDOW_DURATION] *
          (1 + mockApiRateLimitAlgorithm[ApiRateLimitAlgorithmEnum.BURST_ALLOWANCE])
      );
    });
  });
});
