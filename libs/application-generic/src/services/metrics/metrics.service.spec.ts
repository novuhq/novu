import { Test, TestingModule } from '@nestjs/testing';
import { metricsServiceList } from './index';
import { IMetricsService } from './metrics.interface';
import { MetricsService, NewRelicMetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        NewRelicMetricsService,
        {
          provide: 'MetricsServices',
          useFactory: (newRelicMetricsService: NewRelicMetricsService) => [newRelicMetricsService],
          inject: [NewRelicMetricsService],
        },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordMetric', () => {
    it('should call recordMetric on all services', () => {
      const metricName = 'testMetric';
      const metricValue = 123;

      const spyNewRelic = jest.spyOn(NewRelicMetricsService.prototype, 'recordMetric');
      service.recordMetric(metricName, metricValue);

      expect(spyNewRelic).toHaveBeenCalledWith(metricName, metricValue);
    });
  });

  describe('metricsServiceList', () => {
    const createServices = async () =>
      (
        (await Test.createTestingModule({
          providers: [metricsServiceList, MetricsService, NewRelicMetricsService],
        }).compile()) as TestingModule
      ).get<IMetricsService[]>('MetricsServices');

    describe('NewRelic', () => {
      it('should contain NewRelicMetricsService if NEW_RELIC_LICENSE_KEY is set', async () => {
        process.env.NEW_RELIC_LICENSE_KEY = 'test';
        const metricsServices = await createServices();

        expect(metricsServices.some((metricsService) => metricsService instanceof NewRelicMetricsService)).toBe(true);
        delete process.env.NEW_RELIC_LICENSE_KEY;
      });
    });
  });
});
