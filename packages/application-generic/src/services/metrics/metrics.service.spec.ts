import { Test, TestingModule } from '@nestjs/testing';
import {
  MetricsService,
  NewRelicMetricsService,
  AwsMetricsService,
  GCPMetricsService,
  AzureMetricsService,
} from './metrics.service';
import { metricsServiceList } from './index';
import { IMetricsService } from './metrics.interface';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        NewRelicMetricsService,
        AwsMetricsService,
        GCPMetricsService,
        AzureMetricsService,
        {
          provide: 'MetricsServices',
          useFactory: (
            newRelicMetricsService: NewRelicMetricsService,
            gcsMetricsService: GCPMetricsService,
            azureMetricsService: AzureMetricsService,
            awsMetricsService: AwsMetricsService
          ) => [
            newRelicMetricsService,
            gcsMetricsService,
            azureMetricsService,
            awsMetricsService,
          ],
          inject: [
            NewRelicMetricsService,
            GCPMetricsService,
            AzureMetricsService,
            AwsMetricsService,
          ],
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

      const spyNewRelic = jest.spyOn(
        NewRelicMetricsService.prototype,
        'recordMetric'
      );
      const spyAws = jest.spyOn(AwsMetricsService.prototype, 'recordMetric');
      const spyGcs = jest.spyOn(GCPMetricsService.prototype, 'recordMetric');
      const spyAzure = jest.spyOn(
        AzureMetricsService.prototype,
        'recordMetric'
      );

      service.recordMetric(metricName, metricValue);

      expect(spyNewRelic).toHaveBeenCalledWith(metricName, metricValue);
      expect(spyAws).toHaveBeenCalledWith(metricName, metricValue);
      expect(spyGcs).toHaveBeenCalledWith(metricName, metricValue);
      expect(spyAzure).toHaveBeenCalledWith(metricName, metricValue);
    });
  });

  describe('metricsServiceList', () => {
    const createServices = async () =>
      (
        (await Test.createTestingModule({
          providers: [
            metricsServiceList,
            MetricsService,
            NewRelicMetricsService,
            AwsMetricsService,
            GCPMetricsService,
            AzureMetricsService,
          ],
        }).compile()) as TestingModule
      ).get<IMetricsService[]>('MetricsServices');

    describe('NewRelic', () => {
      it('should contain NewRelicMetricsService if NEW_RELIC_LICENSE_KEY is set', async () => {
        process.env.NEW_RELIC_LICENSE_KEY = 'test';
        const metricsServices = await createServices();

        expect(
          metricsServices.some(
            (metricsService) => metricsService instanceof NewRelicMetricsService
          )
        ).toBe(true);
        delete process.env.NEW_RELIC_LICENSE_KEY;
      });
    });

    describe('AWS', () => {
      it('should contain AwsMetricsService if METRICS_SERVICE is set to AWS and Credentials and Region are set', async () => {
        process.env.METRICS_SERVICE = 'AWS';
        process.env.AWS_ACCESS_KEY_ID = 'test';
        process.env.AWS_SECRET_ACCESS_KEY = 'test';
        process.env.AWS_REGION = 'test';
        const metricsServices = await createServices();

        expect(
          metricsServices.some(
            (metricsService) => metricsService instanceof AwsMetricsService
          )
        ).toBe(true);
        delete process.env.METRICS_SERVICE;
        delete process.env.AWS_ACCESS_KEY_ID;
        delete process.env.AWS_SECRET_ACCESS_KEY;
        delete process.env.AWS_REGION;
      });

      it('should throw an error if METRICS_SERVICE is set to AWS and Credentials or Region are not set', async () => {
        process.env.METRICS_SERVICE = 'AWS';
        delete process.env.AWS_ACCESS_KEY_ID;
        delete process.env.AWS_SECRET_ACCESS_KEY;
        delete process.env.AWS_REGION;
        await expect(createServices()).rejects.toThrow(
          'Missing AWS credentials'
        );
        delete process.env.METRICS_SERVICE;
      });
    });

    describe('GCP', () => {
      it('should contain GCPMetricsService if METRICS_SERVICE is set to GCS', async () => {
        process.env.METRICS_SERVICE = 'GCP';
        const metricsServices = await createServices();

        expect(
          metricsServices.some(
            (metricsService) => metricsService instanceof GCPMetricsService
          )
        ).toBe(true);
        delete process.env.METRICS_SERVICE;
      });
    });

    describe('Azure', () => {
      it('should contain AzureMetricsService if METRICS_SERVICE is set to AZURE', async () => {
        process.env.METRICS_SERVICE = 'AZURE';
        const metricsServices = await createServices();

        expect(
          metricsServices.some(
            (metricsService) => metricsService instanceof AzureMetricsService
          )
        ).toBe(true);
        delete process.env.METRICS_SERVICE;
      });
    });
  });
});
