import { Test } from '@nestjs/testing';
import { UserSession as TestUserSession } from '@novu/testing';
import { ApiRateLimitCategoryEnum, ApiRateLimitCostEnum, IJwtPayload } from '@novu/shared';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Controller, Get, Module } from '@nestjs/common';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import { GetIsApiRateLimitingEnabled } from '@novu/application-generic';
import { UserSession } from '../../shared/framework/user.decorator';
import { ApiRateLimitGuard } from './throttler.guard';
import { SharedModule } from '../../shared/shared.module';
import { RateLimitingModule } from '../rate-limiting.module';
import { EvaluateApiRateLimit } from '../usecases/evaluate-api-rate-limit';
import { ThrottlerCategory, ThrottlerCost } from './throttler.decorator';
import { ExpressAdapter } from '@nestjs/platform-express';

@Controller()
class ApiRateLimitController {
  @Get('noAuth')
  noAuth() {
    return 'No Auth';
  }

  @Get('noCategoryNoCost')
  noCategoryNoCost(@UserSession() user: IJwtPayload) {
    return 'No Category with No Cost';
  }

  @Get('global')
  @ThrottlerCategory(ApiRateLimitCategoryEnum.GLOBAL)
  global() {
    return 'Global Category with No Cost';
  }

  @Get('trigger')
  @ThrottlerCategory(ApiRateLimitCategoryEnum.TRIGGER)
  trigger() {
    return 'Trigger Category with No cost';
  }

  @Get('triggerSingleCost')
  @ThrottlerCategory(ApiRateLimitCategoryEnum.TRIGGER)
  @ThrottlerCost(ApiRateLimitCostEnum.SINGLE)
  triggerSingleCost() {
    return 'Trigger Category with SINGLE Cost';
  }

  @Get('triggerBulkCost')
  @ThrottlerCategory(ApiRateLimitCategoryEnum.TRIGGER)
  @ThrottlerCost(ApiRateLimitCostEnum.BULK)
  triggerBulkCost() {
    return 'Trigger Category with BULK Cost';
  }
}

@Module({
  imports: [SharedModule, RateLimitingModule],
  controllers: [ApiRateLimitController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ApiRateLimitGuard,
    },
  ],
})
export class AppModule {}

describe('ApiRateLimitGuard', () => {
  let session: TestUserSession;
  let getIsApiRateLimitingEnabled: GetIsApiRateLimitingEnabled;
  let evaluateApiRateLimit: EvaluateApiRateLimit;

  let getIsApiRateLimitingEnabledStub: sinon.SinonStub;
  let evaluateApiRateLimitStub: sinon.SinonStub;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    session = new TestUserSession();
    await session.initialize();

    getIsApiRateLimitingEnabled = moduleRef.get<GetIsApiRateLimitingEnabled>(GetIsApiRateLimitingEnabled);
    evaluateApiRateLimit = moduleRef.get<EvaluateApiRateLimit>(EvaluateApiRateLimit);

    getIsApiRateLimitingEnabledStub = sinon.stub(getIsApiRateLimitingEnabled, 'execute').resolves(true);
    evaluateApiRateLimitStub = sinon.stub(evaluateApiRateLimit, 'execute').resolves({
      success: true,
      remaining: 1,
      reset: 1,
      algorithm: 'token bucket',
      burstLimit: 0,
      cost: 1,
      limit: 1,
      refillRate: 1,
      windowDuration: 1,
    });

    async function bootstrap() {
      const app = await NestFactory.create(AppModule, new ExpressAdapter());
      await app.listen(3000);
    }
    bootstrap();
  });
  describe('Allowed Request Rate Limit evaluation', () => {
    it('should return true when rate limit is not exceeded', async () => {
      const response = await session.testAgent.get('/noAuth').expect(200);
      session;
      expect(response.text).to.equal('No Auth');
    });
  });

  describe('Allowed Authentication Security Schemes', () => {
    it('should evaluate the rate limit when an ApiKey security schme is used to authenticate', () => {});

    it('should exit early when a Bearer security scheme is used to authenticate', () => {});
  });

  describe('Throttled Request Rate Limit evaluation', () => {
    it('should return true when rate limit is not exceeded', async () => {
      const response = await session.testAgent.get('/noAuth').expect(200);
      expect(response.text).to.equal('No Auth');
    });
  });

  describe('Feature Flag', () => {
    it('should evaluate the rate limit when the Feature Flag is enabled', () => {
      getIsApiRateLimitingEnabledStub.resolves(true);

      expect(getIsApiRateLimitingEnabledStub.calledOnce).to.be.true;
    });

    it('should exit early when the Feature Flag is disabled', () => {
      getIsApiRateLimitingEnabledStub.resolves(false);

      expect(getIsApiRateLimitingEnabledStub.calledOnce).to.be.false;
    });
  });
});
