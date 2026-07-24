import {
  ClickHouseService,
  FeatureFlagsService,
  InboundMailRequestLogger,
  InboundMailTenantResolver,
  InboundParseQueueService,
  PinoLogger,
  RequestLogRepository,
  TraceLogRepository,
  WorkflowInMemoryProviderService,
} from '@novu/application-generic';
import { DalService, DomainRepository } from '@novu/dal';
import logger from './logger';

/**
 * Long-lived dependencies for the inbound-mail SMTP server.
 *
 * In addition to the BullMQ queue producer, we now also wire ClickHouse +
 * MongoDB clients so the server can write the canonical `requests` row (plus
 * `request_received`/`request_queued` traces) as soon as SMTP DATA completes,
 * before parse or enqueue. Both stores are best-effort: failures during analytics writes never block
 * SMTP acceptance, and the analytics path can be turned off entirely via the
 * `IS_ANALYTICS_LOGS_ENABLED` / `IS_INBOUND_ANALYTICS_LOGS_ENABLED` env vars.
 */
export class InboundMailService {
  public inboundParseQueueService: InboundParseQueueService;
  public requestLogger?: InboundMailRequestLogger;
  public tenantResolver?: InboundMailTenantResolver;

  private workflowInMemoryProviderService: WorkflowInMemoryProviderService;
  private dalService?: DalService;
  private clickHouseService?: ClickHouseService;

  constructor() {
    this.workflowInMemoryProviderService = new WorkflowInMemoryProviderService();
    this.inboundParseQueueService = new InboundParseQueueService(this.workflowInMemoryProviderService);
  }

  async start() {
    await this.workflowInMemoryProviderService.initialize();
    await this.initializeAnalytics();
  }

  /**
   * Optional initialization for the inbound-mail request analytics pipeline.
   * The server still works without it — request logging is gated behind two
   * env vars and silently disables itself when ClickHouse or MongoDB cannot
   * be reached.
   */
  private async initializeAnalytics(): Promise<void> {
    if (process.env.IS_ANALYTICS_LOGS_ENABLED !== 'true' || process.env.IS_INBOUND_ANALYTICS_LOGS_ENABLED !== 'true') {
      logger.info(
        { context: 'InboundMailService' },
        'Inbound mail request analytics is disabled — skipping ClickHouse / DAL initialization'
      );

      return;
    }

    try {
      const pinoLogger = new PinoLogger({ pinoHttp: { logger } });

      this.clickHouseService = new ClickHouseService();
      await this.clickHouseService.init();

      const featureFlagsService = new FeatureFlagsService();
      await featureFlagsService.initialize();

      const requestLogRepository = new RequestLogRepository(this.clickHouseService, pinoLogger, featureFlagsService);
      const traceLogRepository = new TraceLogRepository(this.clickHouseService, pinoLogger, featureFlagsService);

      let domainRepository: DomainRepository | undefined;
      if (process.env.MONGO_URL) {
        this.dalService = new DalService();
        await this.dalService.connect(process.env.MONGO_URL);
        domainRepository = new DomainRepository();
      } else {
        logger.warn(
          { context: 'InboundMailService' },
          'MONGO_URL is not set — inbound mail tenant resolution will be limited to reply-to addresses'
        );
      }

      this.tenantResolver = new InboundMailTenantResolver(domainRepository, pinoLogger);
      this.requestLogger = new InboundMailRequestLogger(requestLogRepository, traceLogRepository, pinoLogger);

      logger.info({ context: 'InboundMailService' }, 'Inbound mail request analytics initialized');
    } catch (error) {
      logger.error(
        { err: error, context: 'InboundMailService' },
        'Failed to initialize inbound mail request analytics — continuing without it'
      );
      this.requestLogger = undefined;
      this.tenantResolver = undefined;
    }
  }
}
