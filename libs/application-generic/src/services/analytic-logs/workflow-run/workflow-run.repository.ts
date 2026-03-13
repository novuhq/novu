import { Injectable, Optional } from '@nestjs/common';
import {
  NotificationEntity,
  NotificationRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
} from '@novu/dal';
import {
  DeliveryLifecycleDetail,
  DeliveryLifecycleStatusEnum,
  FeatureFlagsKeysEnum,
  SeverityLevelEnum,
} from '@novu/shared';
import { InferClickhouseSchemaType } from 'clickhouse-schema';
import { PinoLogger } from 'nestjs-pino';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { ClickHouseService, InsertOptions } from '../clickhouse.service';
import { ClickHouseBatchService } from '../clickhouse-batch.service';
import { LogRepository, SchemaKeys, Where } from '../log.repository';
import { getInsertOptions } from '../shared';
import { ORDER_BY, TABLE_NAME, WorkflowRun, WorkflowRunStatusEnum, workflowRunSchema } from './workflow-run.schema';

type WorkflowRunInsertData = Omit<WorkflowRun, 'id' | 'expires_at'>;
type QueryNotificationEntity = Pick<
  NotificationEntity,
  | '_id'
  | '_templateId'
  | '_organizationId'
  | '_environmentId'
  | '_subscriberId'
  | 'transactionId'
  | 'channels'
  | 'to'
  | 'payload'
  | 'controls'
  | 'topics'
  | '_digestedNotificationId'
  | 'createdAt'
  | 'severity'
  | 'critical'
  | 'contextKeys'
>;

interface IWorkflowRunOptions {
  status?: WorkflowRunStatusEnum;
  userId?: string;
  externalSubscriberId?: string;
  deliveryLifecycleStatus?: DeliveryLifecycleStatusEnum;
  deliveryLifecycleDetail?: DeliveryLifecycleDetail;
}

// Type for selected columns from the workflow run schema
type WorkflowRunColumns = keyof InferClickhouseSchemaType<typeof workflowRunSchema>;

// Utility type to create partial WorkflowRun based on selected columns
type SelectedWorkflowRun<T extends readonly WorkflowRunColumns[]> = Pick<WorkflowRun, T[number]>;

const WORKFLOW_RUN_INSERT_OPTIONS: InsertOptions = getInsertOptions(
  process.env.WORKFLOW_RUNS_ASYNC_INSERT,
  process.env.WORKFLOW_RUNS_WAIT_ASYNC_INSERT
);

@Injectable()
export class WorkflowRunRepository extends LogRepository<typeof workflowRunSchema, WorkflowRun> {
  public readonly table = TABLE_NAME;
  public readonly schema = workflowRunSchema;
  public readonly schemaOrderBy: SchemaKeys<typeof workflowRunSchema>[] = ORDER_BY;
  public readonly identifierPrefix = 'wr_';

  constructor(
    protected readonly clickhouseService: ClickHouseService,
    protected readonly logger: PinoLogger,
    protected readonly featureFlagsService: FeatureFlagsService,
    private readonly notificationRepository: NotificationRepository,
    private readonly notificationTemplateRepository: NotificationTemplateRepository,
    @Optional() protected readonly batchService?: ClickHouseBatchService
  ) {
    super(clickhouseService, logger, workflowRunSchema, ORDER_BY, featureFlagsService, batchService);
    this.logger.setContext(this.constructor.name);
  }

  async create(
    notification: NotificationEntity,
    workflow: NotificationTemplateEntity,
    options: IWorkflowRunOptions = {}
  ): Promise<void> {
    try {
      const isEnabled = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_WORKFLOW_RUN_LOGS_WRITE_ENABLED,
        organization: { _id: String(notification._organizationId) },
        environment: { _id: String(notification._environmentId) },
        user: { _id: String(options.userId) },
        defaultValue: false,
      });

      if (!isEnabled) {
        return;
      }

      const workflowRunData = this.mapNotificationToWorkflowRun(notification, workflow, options);

      await this.insert(
        workflowRunData,
        {
          organizationId: notification._organizationId,
          environmentId: notification._environmentId,
          userId: options.userId,
        },
        WORKFLOW_RUN_INSERT_OPTIONS
      );
    } catch (error) {
      this.logger.error(
        {
          err: error,
          workflowRunId: notification._id,
          workflowId: notification._templateId,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to create workflow run'
      );
    }
  }

  /**
   * Updates the status of a workflow run in ClickHouse.
   *
   * Note: ClickHouse doesn't support traditional updates.
   * We'll need to insert a new record with updated status.
   * ReplacingMergeTree will handle deduplication based on workflow_run_id.
   */
  async updateWorkflowRunState(
    workflowRunId: string,
    status: WorkflowRunStatusEnum,
    context: {
      organizationId: string;
      environmentId: string;
    },
    deliveryLifecycleStatus?: DeliveryLifecycleStatusEnum,
    deliveryLifecycleDetail?: DeliveryLifecycleDetail,
    prefetchedData?: {
      notification?: QueryNotificationEntity | null;
      workflow?: Pick<NotificationTemplateEntity, 'name' | 'triggers'> | null;
    }
  ): Promise<void> {
    try {
      const isEnabled = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_WORKFLOW_RUN_LOGS_WRITE_ENABLED,
        organization: { _id: context.organizationId },
        environment: { _id: context.environmentId },
        user: { _id: null },
        defaultValue: false,
      });

      if (!isEnabled) {
        return;
      }

      const notification: QueryNotificationEntity | null =
        (prefetchedData?.notification as QueryNotificationEntity | null) ??
        (await this.notificationRepository.findOne(
          {
            _id: workflowRunId,
            _organizationId: context.organizationId,
            _environmentId: context.environmentId,
          },
          {
            _id: 1,
            _templateId: 1,
            _organizationId: 1,
            _environmentId: 1,
            _subscriberId: 1,
            transactionId: 1,
            channels: 1,
            to: 1,
            payload: 1,
            controls: 1,
            topics: 1,
            _digestedNotificationId: 1,
            createdAt: 1,
            severity: 1,
            critical: 1,
            contextKeys: 1,
          }
        ));

      if (!notification) {
        this.logger.warn(
          {
            workflowRunId,
            organizationId: context.organizationId,
            environmentId: context.environmentId,
          },
          'Notification not found for workflow run status update'
        );

        return;
      }

      const workflow =
        prefetchedData?.workflow ??
        (await this.notificationTemplateRepository.findOne(
          {
            _id: notification._templateId,
            _environmentId: context.environmentId,
          },
          {
            name: 1,
            triggers: 1,
          }
        ));

      if (!workflow) {
        this.logger.warn(
          {
            workflowRunId,
            templateId: notification._templateId,
            environmentId: context.environmentId,
          },
          'Notification template not found for workflow run status update'
        );

        return;
      }

      const workflowRunData = this.mapNotificationToWorkflowRun(notification, workflow as NotificationTemplateEntity, {
        status,
        deliveryLifecycleStatus,
        deliveryLifecycleDetail,
        userId: null,
        externalSubscriberId: notification.to?.subscriberId || null,
      });

      await this.insert(workflowRunData, context, WORKFLOW_RUN_INSERT_OPTIONS);

      this.logger.debug(
        {
          workflowRunId,
          status,
          organizationId: context.organizationId,
          environmentId: context.environmentId,
        },
        'Workflow run status updated'
      );
    } catch (error) {
      this.logger.error(
        {
          err: error,
          workflowRunId,
          status,
          organizationId: context.organizationId,
          environmentId: context.environmentId,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to update workflow run status'
      );
    }
  }

  // Overload for column array selection
  async findWithCursor<T extends readonly WorkflowRunColumns[]>(options: {
    where: Where<WorkflowRun>;
    cursor?: {
      created_at: string;
      workflow_run_id: string;
    };
    limit?: number;
    orderDirection?: 'ASC' | 'DESC';
    useFinal?: boolean;
    select: T;
  }): Promise<{
    data: SelectedWorkflowRun<T>[];
    rows: number;
  }>;

  // Overload for "*" all columns selection
  async findWithCursor(options: {
    where: Where<WorkflowRun>;
    cursor?: {
      created_at: string;
      workflow_run_id: string;
    };
    limit?: number;
    orderDirection?: 'ASC' | 'DESC';
    useFinal?: boolean;
    select: '*';
  }): Promise<{
    data: WorkflowRun[];
    rows: number;
  }>;

  /**
   * Compound cursor-based pagination for workflow runs with automatic tenant enforcement.
   * Handles timestamp collisions by using both created_at and workflow_run_id.
   * All queries are secure by default with mandatory tenant isolation.
   */
  async findWithCursor<T extends readonly WorkflowRunColumns[] | '*'>(options: {
    where: Where<WorkflowRun>;
    cursor?: {
      created_at: string;
      workflow_run_id: string;
    };
    limit?: number;
    orderDirection?: 'ASC' | 'DESC';
    useFinal?: boolean;
    select: T;
  }): Promise<{
    data: WorkflowRun[] | SelectedWorkflowRun<T extends readonly WorkflowRunColumns[] ? T : never>[];
    rows: number;
  }> {
    const { where, cursor, limit = 100, orderDirection = 'DESC', useFinal = false, select } = options;
    const isBoundaryCase = cursor?.workflow_run_id === '1';

    if (limit < 0 || limit > 1000) {
      throw new Error('Limit must be between 0 and 1000');
    }

    // Build the base WHERE clause with automatic tenant enforcement
    const { clause: baseClause, params: baseParams } = this.buildWhereClause(where);

    let whereClause = baseClause || 'WHERE 1=1';
    const params = { ...baseParams };

    // Add compound cursor conditions if cursor is provided
    if (cursor) {
      const cursorTimestamp = new Date(cursor.created_at);
      const cursorId = cursor.workflow_run_id;

      const timestampParam = 'cursor_timestamp';
      const timestampEqualParam = 'cursor_timestamp_eq';
      const idParam = 'cursor_id';

      const timeOperator = orderDirection === 'DESC' ? '<' : '>';
      const idOperator = orderDirection === 'DESC' ? '<' : '>';

      if (!isBoundaryCase) {
        params[timestampParam] = cursorTimestamp;
        params[timestampEqualParam] = cursorTimestamp;
        params[idParam] = cursorId;
      } else {
        params[timestampParam] = timeOperator === '>' ? new Date(0) : new Date('2099-12-31T23:59:59.999Z');
        params[timestampEqualParam] = timeOperator === '>' ? new Date(0) : new Date('2099-12-31T23:59:59.999Z');
        params[idParam] = timeOperator === '>' ? '1' : '9999999999999999999999999999999999999999';
      }

      const cursorCondition = `
        (created_at ${timeOperator} {${timestampParam}:DateTime64(3, 'UTC')})
        OR (
          created_at = {${timestampEqualParam}:DateTime64(3, 'UTC')} 
          AND workflow_run_id ${idOperator} {${idParam}:String}
        )
      `;

      if (whereClause && whereClause !== 'WHERE 1=1') {
        whereClause = `${whereClause} AND (${cursorCondition})`;
      } else {
        whereClause = `WHERE ${cursorCondition}`;
      }
    }

    const finalModifier = useFinal ? ' FINAL' : '';
    const orderByClause = `ORDER BY created_at ${orderDirection}, workflow_run_id ${orderDirection}`;

    // Build SELECT clause - use provided columns or all columns if "*" is specified
    const selectClause = select === '*' ? '*' : (select as readonly string[]).join(', ');

    const query = `
      SELECT ${selectClause}
      FROM ${this.table}${finalModifier}
      ${whereClause}
      ${orderByClause}
      LIMIT ${limit}
    `;

    this.logger.debug(
      {
        query: query.replace(/\s+/g, ' ').trim(),
        cursor: cursor ? 'present' : 'none',
        selectedColumns: select === '*' ? 'all' : (select as readonly string[]).length,
        tenantEnforcement: '__unsafe' in where ? 'bypassed' : 'enforced',
      },
      'Executing compound cursor query with tenant enforcement'
    );

    const result = await this.clickhouseService.query({
      query,
      params,
    });

    return result as {
      data: WorkflowRun[] | SelectedWorkflowRun<T extends readonly WorkflowRunColumns[] ? T : never>[];
      rows: number;
    };
  }

  private mapNotificationToWorkflowRun(
    notification: QueryNotificationEntity,
    workflow: NotificationTemplateEntity,
    options: IWorkflowRunOptions
  ): WorkflowRunInsertData {
    const now = new Date();

    return {
      created_at: LogRepository.formatDateTime64(new Date(notification.createdAt)),
      updated_at: LogRepository.formatDateTime64(now),

      // Core workflow run identification
      workflow_run_id: notification._id,
      workflow_id: notification._templateId,
      workflow_name: workflow.name,

      // Context
      organization_id: notification._organizationId,
      environment_id: notification._environmentId,
      user_id: options.userId || null,
      subscriber_id: notification._subscriberId,
      external_subscriber_id: options.externalSubscriberId || null,

      // Execution metadata
      status: options.status || WorkflowRunStatusEnum.PROCESSING,
      trigger_identifier: this.getTriggerIdentifier(workflow),

      // Correlation and grouping
      transaction_id: notification.transactionId,
      channels: JSON.stringify(notification.channels || []),

      // Subscriber context
      subscriber_to: notification.to ? JSON.stringify(notification.to) : null,
      payload: notification.payload ? JSON.stringify(notification.payload) : null,
      control_values: notification.controls ? JSON.stringify(notification.controls) : null,

      // Topic information
      topics: notification.topics ? notification.topics && JSON.stringify(notification.topics) : null,

      // Digest information
      is_digest: notification._digestedNotificationId ? 'true' : 'false',
      digested_workflow_run_id: notification._digestedNotificationId || null,

      // Delivery lifecycle
      ...(options.deliveryLifecycleStatus && { delivery_lifecycle_status: options.deliveryLifecycleStatus }),
      ...(options.deliveryLifecycleDetail && { delivery_lifecycle_detail: options.deliveryLifecycleDetail }),

      severity: notification.severity || SeverityLevelEnum.NONE,
      critical: notification.critical || false,
      context_keys: notification.contextKeys || [],
    };
  }

  private getTriggerIdentifier(template: NotificationTemplateEntity): string {
    if (template.triggers && template.triggers.length > 0) {
      return template.triggers[0].identifier;
    }

    return template.name.toLowerCase().replace(/\s+/g, '_');
  }

  async getWorkflowVolumeData(
    environmentId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date,
    workflowIds?: string[]
  ): Promise<Array<{ workflow_name: string; count: string }>> {
    const workflowFilter =
      workflowIds && workflowIds.length > 0 ? 'AND workflow_id IN {workflowIds:Array(String)}' : '';

    const query = `
      SELECT 
        workflow_name,
        count(*) as count
      FROM workflow_runs FINAL
      WHERE 
        environment_id = {environmentId:String} 
        AND organization_id = {organizationId:String}
        AND created_at >= {startDate:DateTime64(3)}
        AND created_at <= {endDate:DateTime64(3)}
        ${workflowFilter}
      GROUP BY workflow_name
      ORDER BY count DESC
      LIMIT 5
    `;

    const params: Record<string, unknown> = {
      environmentId,
      organizationId,
      startDate: LogRepository.formatDateTime64(startDate),
      endDate: LogRepository.formatDateTime64(endDate),
    };

    if (workflowIds && workflowIds.length > 0) {
      params.workflowIds = workflowIds;
    }

    const result = await this.clickhouseService.query<{
      workflow_name: string;
      count: string;
    }>({
      query,
      params,
    });

    return result.data;
  }

  async getActiveSubscribersData(
    environmentId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date,
    previousStartDate: Date,
    previousEndDate: Date,
    workflowIds?: string[]
  ): Promise<{ currentPeriod: number; previousPeriod: number }> {
    const workflowFilter =
      workflowIds && workflowIds.length > 0 ? 'AND workflow_id IN {workflowIds:Array(String)}' : '';

    // Query for current period
    const currentPeriodQuery = `
      SELECT count(DISTINCT external_subscriber_id) as count
      FROM workflow_runs FINAL
      WHERE 
        environment_id = {environmentId:String} 
        AND organization_id = {organizationId:String}
        AND created_at >= {startDate:DateTime64(3)}
        AND created_at <= {endDate:DateTime64(3)}
        ${workflowFilter}
    `;

    // Query for previous period
    const previousPeriodQuery = `
      SELECT count(DISTINCT external_subscriber_id) as count
      FROM workflow_runs FINAL
      WHERE 
        environment_id = {environmentId:String} 
        AND organization_id = {organizationId:String}
        AND created_at >= {previousStartDate:DateTime64(3)}
        AND created_at <= {previousEndDate:DateTime64(3)}
        ${workflowFilter}
    `;

    const baseParams: Record<string, unknown> = {
      environmentId,
      organizationId,
    };

    if (workflowIds && workflowIds.length > 0) {
      baseParams.workflowIds = workflowIds;
    }

    const [currentResult, previousResult] = await Promise.all([
      this.clickhouseService.query<{ count: string }>({
        query: currentPeriodQuery,
        params: {
          ...baseParams,
          startDate: LogRepository.formatDateTime64(startDate),
          endDate: LogRepository.formatDateTime64(endDate),
        },
      }),
      this.clickhouseService.query<{ count: string }>({
        query: previousPeriodQuery,
        params: {
          ...baseParams,
          previousStartDate: LogRepository.formatDateTime64(previousStartDate),
          previousEndDate: LogRepository.formatDateTime64(previousEndDate),
        },
      }),
    ]);

    const currentPeriod = parseInt(currentResult.data[0]?.count || '0', 10);
    const previousPeriod = parseInt(previousResult.data[0]?.count || '0', 10);

    return {
      currentPeriod,
      previousPeriod,
    };
  }

  async getWorkflowRunsMetricData(
    environmentId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date,
    previousStartDate: Date,
    previousEndDate: Date,
    workflowIds?: string[]
  ): Promise<{ currentPeriod: number; previousPeriod: number }> {
    const workflowFilter =
      workflowIds && workflowIds.length > 0 ? 'AND workflow_id IN {workflowIds:Array(String)}' : '';

    // Query for current period
    const currentPeriodQuery = `
      SELECT count(*) as count
      FROM workflow_runs FINAL
      WHERE
        environment_id = {environmentId:String}
        AND organization_id = {organizationId:String}
        AND created_at >= {startDate:DateTime64(3)}
        AND created_at <= {endDate:DateTime64(3)}
        ${workflowFilter}
    `;

    // Query for previous period
    const previousPeriodQuery = `
      SELECT count(*) as count
      FROM workflow_runs FINAL
      WHERE
        environment_id = {environmentId:String}
        AND organization_id = {organizationId:String}
        AND created_at >= {previousStartDate:DateTime64(3)}
        AND created_at <= {previousEndDate:DateTime64(3)}
        ${workflowFilter}
    `;

    const baseParams: Record<string, unknown> = {
      environmentId,
      organizationId,
    };

    if (workflowIds && workflowIds.length > 0) {
      baseParams.workflowIds = workflowIds;
    }

    const [currentResult, previousResult] = await Promise.all([
      this.clickhouseService.query<{ count: string }>({
        query: currentPeriodQuery,
        params: {
          ...baseParams,
          startDate: LogRepository.formatDateTime64(startDate),
          endDate: LogRepository.formatDateTime64(endDate),
        },
      }),
      this.clickhouseService.query<{ count: string }>({
        query: previousPeriodQuery,
        params: {
          ...baseParams,
          previousStartDate: LogRepository.formatDateTime64(previousStartDate),
          previousEndDate: LogRepository.formatDateTime64(previousEndDate),
        },
      }),
    ]);

    const currentPeriod = parseInt(currentResult.data[0]?.count || '0', 10);
    const previousPeriod = parseInt(previousResult.data[0]?.count || '0', 10);

    return {
      currentPeriod,
      previousPeriod,
    };
  }

  async getWorkflowRunsTrendData(
    environmentId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date,
    workflowIds?: string[]
  ): Promise<Array<{ date: string; status: string; count: string }>> {
    const workflowFilter =
      workflowIds && workflowIds.length > 0 ? 'AND workflow_id IN {workflowIds:Array(String)}' : '';

    const query = `
      SELECT 
        toDate(created_at) as date,
        status,
        count(*) as count
      FROM workflow_runs FINAL
      WHERE 
        environment_id = {environmentId:String} 
        AND organization_id = {organizationId:String}
        AND created_at >= {startDate:DateTime64(3)}
        AND created_at <= {endDate:DateTime64(3)}
        ${workflowFilter}
      GROUP BY date, status
      ORDER BY date, status
    `;

    const params: Record<string, unknown> = {
      environmentId,
      organizationId,
      startDate: LogRepository.formatDateTime64(startDate),
      endDate: LogRepository.formatDateTime64(endDate),
    };

    if (workflowIds && workflowIds.length > 0) {
      params.workflowIds = workflowIds;
    }

    const result = await this.clickhouseService.query<{
      date: string;
      status: string;
      count: string;
    }>({
      query,
      params,
    });

    return result.data;
  }

  async getActiveSubscribersTrendData(
    environmentId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date,
    workflowIds?: string[]
  ): Promise<Array<{ date: string; count: string }>> {
    const workflowFilter =
      workflowIds && workflowIds.length > 0 ? 'AND workflow_id IN {workflowIds:Array(String)}' : '';

    const query = `
      SELECT 
        toDate(created_at) as date,
        count(DISTINCT external_subscriber_id) as count
      FROM workflow_runs FINAL
      WHERE 
        environment_id = {environmentId:String} 
        AND organization_id = {organizationId:String}
        AND created_at >= {startDate:DateTime64(3)}
        AND created_at <= {endDate:DateTime64(3)}
        ${workflowFilter}
      GROUP BY date
      ORDER BY date
    `;

    const params: Record<string, unknown> = {
      environmentId,
      organizationId,
      startDate: LogRepository.formatDateTime64(startDate),
      endDate: LogRepository.formatDateTime64(endDate),
    };

    if (workflowIds && workflowIds.length > 0) {
      params.workflowIds = workflowIds;
    }

    const result = await this.clickhouseService.query<{
      date: string;
      count: string;
    }>({
      query,
      params,
    });

    return result.data;
  }

  async getPlatformUsageByDateRange(
    startDate: Date,
    endDate: Date,
    organizationId?: string
  ): Promise<Array<{ organization_id: string; count: string }>> {
    const organizationFilter = organizationId ? 'AND organization_id = {organizationId:String}' : '';

    const query = `
      SELECT 
        organization_id,
        count(*) as count
      FROM workflow_runs FINAL
      WHERE 
        created_at >= {startDate:DateTime64(3)}
        AND created_at < {endDate:DateTime64(3)}
        ${organizationFilter}
      GROUP BY organization_id
      ORDER BY organization_id
    `;

    const params: Record<string, unknown> = {
      startDate: LogRepository.formatDateTime64(startDate),
      endDate: LogRepository.formatDateTime64(endDate),
    };

    if (organizationId) {
      params.organizationId = organizationId;
    }

    const result = await this.clickhouseService.query<{
      organization_id: string;
      count: string;
    }>({
      query,
      params,
    });

    const totalCount = result.data.reduce((sum, item) => sum + parseInt(item.count, 10), 0);

    this.logger.debug(
      {
        query: query.replace(/\s+/g, ' ').trim(),
        params: {
          ...params,
          startDateRaw: startDate.toISOString(),
          endDateRaw: endDate.toISOString(),
        },
        organizationId,
        resultCount: result.data.length,
        totalRecords: totalCount,
      },
      'ClickHouse platform usage query completed'
    );

    return result.data;
  }
}
