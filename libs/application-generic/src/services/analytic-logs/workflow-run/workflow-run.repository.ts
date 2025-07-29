import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { NotificationEntity, NotificationTemplateEntity } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { InferClickhouseSchemaType } from 'clickhouse-schema';
import { LogRepository, SchemaKeys, Where } from '../log.repository';
import { ClickHouseService, InsertOptions } from '../clickhouse.service';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { workflowRunSchema, ORDER_BY, TABLE_NAME, WorkflowRun, WorkflowRunStatusEnum } from './workflow-run.schema';
import { getInsertOptions } from '../shared';

type WorkflowRunInsertData = Omit<InferClickhouseSchemaType<typeof workflowRunSchema>, 'id' | 'expires_at'>;

interface IWorkflowRunOptions {
  status?: WorkflowRunStatusEnum;
  userId?: string;
  externalSubscriberId?: string;
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
    protected readonly featureFlagsService: FeatureFlagsService
  ) {
    super(clickhouseService, logger, workflowRunSchema, ORDER_BY, featureFlagsService);
    this.logger.setContext(this.constructor.name);
  }

  async create(
    notification: NotificationEntity,
    template: NotificationTemplateEntity,
    options: IWorkflowRunOptions = {}
  ): Promise<void> {
    try {
      const isEnabled = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_WORKFLOW_RUN_LOGS_WRITE_ENABLED,
        organization: { _id: notification._organizationId },
        environment: { _id: notification._environmentId },
        user: { _id: options.userId },
        defaultValue: false,
      });

      if (!isEnabled) {
        return;
      }

      const workflowRunData = this.mapNotificationToWorkflowRun(notification, template, options);

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

  async createWorkflowRunBatch(
    notifications: Array<{
      notification: NotificationEntity;
      template: NotificationTemplateEntity;
      options?: IWorkflowRunOptions;
    }>
  ): Promise<void> {
    if (notifications.length === 0) return;

    try {
      const firstNotification = notifications[0].notification;

      const isEnabled = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_WORKFLOW_RUN_LOGS_WRITE_ENABLED,
        organization: { _id: firstNotification._organizationId },
        environment: { _id: firstNotification._environmentId },
        user: { _id: notifications[0].options?.userId },
        defaultValue: false,
      });

      if (!isEnabled) {
        return;
      }

      const workflowRunsData = notifications.map(({ notification, template, options = {} }) =>
        this.mapNotificationToWorkflowRun(notification, template, options)
      );

      await this.insertMany(
        workflowRunsData,
        {
          organizationId: firstNotification._organizationId,
          environmentId: firstNotification._environmentId,
          userId: notifications[0].options?.userId,
        },
        WORKFLOW_RUN_INSERT_OPTIONS
      );

      this.logger.debug(
        {
          batchSize: notifications.length,
          organizationId: firstNotification._organizationId,
          environmentId: firstNotification._environmentId,
        },
        'Workflow run batch created for observability'
      );
    } catch (error) {
      this.logger.error(
        {
          err: error,
          batchSize: notifications.length,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to create workflow run batch'
      );
      // Don't rethrow to avoid breaking the main flow
    }
  }

  /**
   * Updates the status of a workflow run in ClickHouse.
   *
   * Note: ClickHouse doesn't support traditional updates.
   * We'll need to insert a new record with updated status.
   * ReplacingMergeTree will handle deduplication based on workflow_run_id.
   */
  async updateWorkflowRunStatus(
    workflowRunId: string,
    status: WorkflowRunStatusEnum,
    context: {
      organizationId: string;
      environmentId: string;
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

      const existingRuns = await this.find({
        where: {
          workflow_run_id: workflowRunId,
          organization_id: context.organizationId,
          environment_id: context.environmentId,
        },
        limit: 1,
      });

      if (existingRuns.data.length === 0) {
        this.logger.warn(`Workflow run ${workflowRunId} not found for status update`);

        return;
      }

      const existingRun = existingRuns.data[0];

      await this.insert(
        {
          created_at: existingRun.created_at,
          updated_at: LogRepository.formatDateTime64(new Date()),
          workflow_run_id: existingRun.workflow_run_id,
          workflow_id: existingRun.workflow_id,
          workflow_name: existingRun.workflow_name,
          organization_id: existingRun.organization_id,
          environment_id: existingRun.environment_id,
          user_id: existingRun.user_id,
          subscriber_id: existingRun.subscriber_id,
          external_subscriber_id: existingRun.external_subscriber_id,
          status,
          trigger_identifier: existingRun.trigger_identifier,
          transaction_id: existingRun.transaction_id,
          channels: existingRun.channels,
          subscriber_to: existingRun.subscriber_to,
          payload: existingRun.payload,
          control_values: existingRun.control_values,
          topics: existingRun.topics,
          is_digest: existingRun.is_digest,
          digested_workflow_run_id: existingRun.digested_workflow_run_id,
        },
        context,
        WORKFLOW_RUN_INSERT_OPTIONS
      );

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

  // Overload for when select is provided
  async findWithCursor<T extends readonly WorkflowRunColumns[]>(options: {
    where: Where<InferClickhouseSchemaType<typeof workflowRunSchema>>;
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

  // Overload for when select is not provided (fallback to full WorkflowRun)
  async findWithCursor(options: {
    where: Where<InferClickhouseSchemaType<typeof workflowRunSchema>>;
    cursor?: {
      created_at: string;
      workflow_run_id: string;
    };
    limit?: number;
    orderDirection?: 'ASC' | 'DESC';
    useFinal?: boolean;
    select?: undefined;
  }): Promise<{
    data: WorkflowRun[];
    rows: number;
  }>;

  /**
   * Compound cursor-based pagination for workflow runs.
   * Handles timestamp collisions by using both created_at and workflow_run_id.
   *
   * This implements industry best practices.
   * The compound condition ensures no records are skipped or duplicated when
   * multiple workflow runs have identical timestamps.
   */
  async findWithCursor<T extends readonly WorkflowRunColumns[]>(options: {
    where: Where<InferClickhouseSchemaType<typeof workflowRunSchema>>;
    cursor?: {
      created_at: string;
      workflow_run_id: string;
    };
    limit?: number;
    orderDirection?: 'ASC' | 'DESC';
    useFinal?: boolean;
    select?: T;
  }): Promise<{
    data: WorkflowRun[] | SelectedWorkflowRun<T>[];
    rows: number;
  }> {
    const { where, cursor, limit = 100, orderDirection = 'DESC', useFinal = false, select } = options;
    const isBoundaryCase = cursor?.workflow_run_id === '1'; // first or last item

    if (limit < 0 || limit > 1000) {
      throw new Error('Limit must be between 0 and 1000');
    }

    // Extract and handle date range conditions
    const processedWhere = { ...where };
    const dateRangeConditions: string[] = [];
    const dateRangeParams: Record<string, any> = {};

    // Handle created_at_gte condition
    if ('created_at_gte' in processedWhere) {
      const gteCondition = processedWhere.created_at_gte as any;
      const gteValue = gteCondition.value || gteCondition;
      dateRangeParams.created_at_gte = gteValue;
      dateRangeConditions.push("created_at >= {created_at_gte:DateTime64(3, 'UTC')}");
      delete processedWhere.created_at_gte;
    }

    // Handle created_at_lte condition
    if ('created_at_lte' in processedWhere) {
      const lteCondition = processedWhere.created_at_lte as any;
      const lteValue = lteCondition.value || lteCondition;
      dateRangeParams.created_at_lte = lteValue;
      dateRangeConditions.push("created_at <= {created_at_lte:DateTime64(3, 'UTC')}");
      delete processedWhere.created_at_lte;
    }

    // Build the base WHERE clause with processed conditions
    const { clause: baseClause, params: baseParams } = this.buildWhereClause(processedWhere);

    // Use 'WHERE 1=1' as neutral base to simplify dynamic AND condition appending
    let whereClause = baseClause || 'WHERE 1=1';
    const params = { ...baseParams, ...dateRangeParams };

    // Add date range conditions to the WHERE clause
    if (dateRangeConditions.length > 0) {
      const dateRangeClause = dateRangeConditions.join(' AND ');
      if (baseClause) {
        whereClause = `${baseClause} AND ${dateRangeClause}`;
      } else {
        whereClause = `WHERE ${dateRangeClause}`;
      }
    }

    // Add compound cursor conditions if cursor is provided
    if (cursor) {
      const cursorTimestamp = new Date(cursor.created_at);
      const cursorId = cursor.workflow_run_id;

      // Generate unique parameter names for cursor conditions
      const timestampParam = 'cursor_timestamp';
      const timestampEqualParam = 'cursor_timestamp_eq';
      const idParam = 'cursor_id';

      /*
       * Build compound cursor condition
       * For DESC: (created_at < cursor_timestamp) OR (created_at = cursor_timestamp AND workflow_run_id < cursor_id)
       * For ASC: (created_at > cursor_timestamp) OR (created_at = cursor_timestamp AND workflow_run_id > cursor_id)
       */
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

      // Combine existing WHERE clause with cursor conditions
      if (whereClause && whereClause !== 'WHERE 1=1') {
        whereClause = `${whereClause} AND (${cursorCondition})`;
      } else {
        whereClause = `WHERE ${cursorCondition}`;
      }
    }

    const finalModifier = useFinal ? ' FINAL' : '';
    const orderByClause = `ORDER BY created_at ${orderDirection}, workflow_run_id ${orderDirection}`;

    // Build SELECT clause - use selected columns or fallback to wildcard
    const selectClause = select && select.length > 0 ? select.join(', ') : '*';

    const query = `
      SELECT ${selectClause}
      FROM ${this.table}${finalModifier}
      ${whereClause}
      ${orderByClause}
      LIMIT ${limit}
    `;

    this.logger.debug('Executing compound cursor query', {
      query: query.replace(/\s+/g, ' ').trim(),
      params,
      cursor: cursor ? 'present' : 'none',
      selectedColumns: select ? select.length : 'all',
    });

    const result = await this.clickhouseService.query({
      query,
      params,
    });

    return {
      data: result.data as any,
      rows: result.rows,
    };
  }

  private mapNotificationToWorkflowRun(
    notification: NotificationEntity,
    template: NotificationTemplateEntity,
    options: IWorkflowRunOptions
  ): WorkflowRunInsertData {
    const now = new Date();
    const createdAt = new Date(now);

    return {
      created_at: LogRepository.formatDateTime64(createdAt),
      updated_at: LogRepository.formatDateTime64(now),

      // Core workflow run identification
      workflow_run_id: notification._id,
      workflow_id: notification._templateId,
      workflow_name: template.name,

      // Context
      organization_id: notification._organizationId,
      environment_id: notification._environmentId,
      user_id: options.userId || null,
      subscriber_id: notification._subscriberId,
      external_subscriber_id: options.externalSubscriberId || null,

      // Execution metadata
      status: options.status || 'pending',
      trigger_identifier: this.getTriggerIdentifier(template),

      // Correlation and grouping
      transaction_id: notification.transactionId,
      channels: JSON.stringify(notification.channels || []),

      // Subscriber context
      subscriber_to: notification.to ? JSON.stringify(notification.to) : null,
      payload: notification.payload ? JSON.stringify(notification.payload) : null,
      control_values: notification.controls ? JSON.stringify(notification.controls) : null,

      // Topic information
      topics: notification.topics ? JSON.stringify(notification.topics) : null,

      // Digest information
      is_digest: notification._digestedNotificationId ? 'true' : 'false',
      digested_workflow_run_id: notification._digestedNotificationId || null,
    };
  }

  private getTriggerIdentifier(template: NotificationTemplateEntity): string {
    if (template.triggers && template.triggers.length > 0) {
      return template.triggers[0].identifier;
    }

    return template.name.toLowerCase().replace(/\s+/g, '_');
  }
}
