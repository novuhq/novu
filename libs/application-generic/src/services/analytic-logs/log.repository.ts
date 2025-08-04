import { FeatureFlagsKeysEnum } from '@novu/shared';
import { ClickhouseSchema, InferClickhouseSchemaType } from 'clickhouse-schema';
import { addDays } from 'date-fns';
import { PinoLogger } from 'nestjs-pino';
import { generateObjectId } from '../../utils/generate-id';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { ClickHouseService, InsertOptions } from './clickhouse.service';

// Define operators as const assertion to maintain literal types
const CLICKHOUSE_OPERATORS = [
  '=',
  '==',
  '!=',
  '<>',
  '<=',
  '>=',
  '<',
  '>',
  'LIKE',
  'NOT LIKE',
  'ILIKE',
  'IN',
  'NOT IN',
  'GLOBAL IN',
  'GLOBAL NOT IN',
] as const;

// Define array operators that require array values
type ArrayOperators = 'IN' | 'NOT IN' | 'GLOBAL IN' | 'GLOBAL NOT IN';

// Generate the type from the const array - this ensures single source of truth
export type ClickhouseOperator = (typeof CLICKHOUSE_OPERATORS)[number];

// Export the array for runtime validation
export const ALLOWED_OPERATORS: readonly ClickhouseOperator[] = CLICKHOUSE_OPERATORS;

const LIMIT_MAX_THRESHOLD = 1000;
export const ORDER_DIRECTION = ['ASC', 'DESC'];

export type OrCondition<T> = {
  $or: WhereCondition<T>[];
};

export type EnforcedContext = {
  environmentId: string;
};

type FieldCondition<T> = {
  [K in keyof T]: {
    [O in ClickhouseOperator]: {
      field: K;
      operator: O;
      value: O extends ArrayOperators ? T[K][] : T[K];
    };
  }[ClickhouseOperator];
}[keyof T];

type WhereCondition<T> = FieldCondition<T> | OrCondition<T>;

export interface EnforcedWhere<T> {
  enforced: EnforcedContext;
  conditions?: WhereCondition<T>[];
}

// For system operations that need to bypass tenant enforcement (logged for monitoring)
export interface UnsafeWhere<T> {
  conditions: WhereCondition<T>[];
  __unsafe: true; // Explicit opt-in to bypass enforcement
}

export type Where<T> = EnforcedWhere<T> | UnsafeWhere<T>;

export type SchemaKeys<T extends ClickhouseSchema<any>> = keyof InferClickhouseSchemaType<T>;

export abstract class LogRepository<T_Schema extends ClickhouseSchema<any>, T_Enhanced_Type> {
  readonly table: string;
  readonly identifierPrefix: string;

  constructor(
    protected readonly clickhouseService: ClickHouseService,
    protected readonly logger: PinoLogger,
    protected readonly schema: T_Schema,
    protected readonly schemaOrderBy: SchemaKeys<T_Schema>[],
    protected readonly featureFlagsService: FeatureFlagsService
  ) {
    this.initialize();
  }

  private async initialize() {
    if (process.env.NODE_ENV !== 'local' && process.env.NODE_ENV !== 'test') {
      return;
    }

    const query = this.schema.GetCreateTableQuery();

    try {
      await this.clickhouseService.exec({ query });
      console.log('Table created', this.table);
    } catch (error) {
      this.logger.error('Failed to create ClickHouse table', error);
    }
  }

  private getColumnType(column: string): string {
    return this.schema.schema[column]?.type?.toString() || 'String';
  }

  private validateColumnName(columnName: SchemaKeys<T_Schema>): void {
    if (!columnName || typeof columnName !== 'string') {
      throw new Error('Invalid column name: must be a non-empty string');
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(columnName)) {
      throw new Error(`Invalid column name format: ${columnName}`);
    }

    if (!this.schema.schema[columnName]) {
      throw new Error(`Column '${columnName}' does not exist in schema`);
    }
  }

  private validateOperator(operator: ClickhouseOperator): void {
    if (!ALLOWED_OPERATORS.includes(operator)) {
      throw new Error(`Invalid operator: ${operator}. Allowed operators: ${ALLOWED_OPERATORS.join(', ')}`);
    }
  }

  protected async getExpirationDate(context?: {
    organizationId?: string;
    environmentId?: string;
    userId?: string;
  }): Promise<Date> {
    try {
      const expirationDays = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.LOG_EXPIRATION_DAYS_NUMBER,
        defaultValue: 100,
        organization: context?.organizationId ? { _id: context.organizationId } : undefined,
        environment: context?.environmentId ? { _id: context.environmentId } : undefined,
        user: context?.userId ? { _id: context.userId } : undefined,
      });

      return addDays(new Date(), expirationDays);
    } catch (error) {
      this.logger.warn(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'Failed to fetch log expiration days from LaunchDarkly, falling back to 100 days'
      );

      return addDays(new Date(), 100);
    }
  }

  protected buildWhereClause(where: Where<T_Enhanced_Type>): {
    clause: string;
    params: Record<string, any>;
  } {
    // Cast enhanced type to raw schema type only at this lowest level
    const rawWhere = where as unknown as Where<InferClickhouseSchemaType<T_Schema>>;
    let allConditions: WhereCondition<InferClickhouseSchemaType<T_Schema>>[] = [];

    if ('__unsafe' in rawWhere) {
      // Unsafe mode - log for monitoring but allow
      this.logger.warn('Using unsafe WHERE clause without tenant enforcement', {
        table: this.table,
        conditionsCount: rawWhere.conditions.length,
      });
      allConditions = rawWhere.conditions;
    } else {
      // Safe mode - enforce tenant context
      const enforcedConditions = this.buildEnforcedConditions(rawWhere.enforced);
      allConditions = [...enforcedConditions, ...(rawWhere.conditions || [])];
    }

    return this.buildWhereClauseFromConditions(allConditions);
  }

  private buildEnforcedConditions(enforced: EnforcedContext): WhereCondition<InferClickhouseSchemaType<T_Schema>>[] {
    const condition = {
      field: 'environment_id' as keyof InferClickhouseSchemaType<T_Schema>,
      operator: '=' as const,
      value: enforced.environmentId,
    };

    const conditions: WhereCondition<InferClickhouseSchemaType<T_Schema>>[] = [condition];

    return conditions;
  }

  private buildWhereClauseFromConditions(conditions: WhereCondition<InferClickhouseSchemaType<T_Schema>>[]): {
    clause: string;
    params: Record<string, any>;
  } {
    const params: Record<string, any> = {};
    let paramIndex = 0;

    const buildSingleCondition = (condition: any): string => {
      const entries = Object.entries(condition);
      if (entries.length !== 1) {
        throw new Error('Each where condition must have exactly one property');
      }

      const [key, value] = entries[0];

      // Handle OR conditions
      if (key === '$or') {
        if (!Array.isArray(value)) {
          throw new Error('$or condition must contain an array of conditions');
        }

        const orClauses = value.map((orCondition) => buildSingleCondition(orCondition));
        return `(${orClauses.join(' OR ')})`;
      }

      // Handle regular conditions
      this.validateColumnName(key as SchemaKeys<T_Schema>);

      let operator: ClickhouseOperator = '=';
      let actualValue = value;

      if (typeof value === 'object' && value !== null && 'operator' in value && 'value' in value) {
        operator = value.operator as ClickhouseOperator;
        actualValue = value.value;
      }

      this.validateOperator(operator);

      const paramName = `param_${paramIndex}_${key.replace(/[^a-zA-Z0-9]/g, '')}`;
      paramIndex++;

      if (actualValue === null || actualValue === undefined) {
        throw new Error(`Invalid value for column '${key}': value cannot be null or undefined`);
      }

      params[paramName] = actualValue;

      // Determine the correct parameter type based on operator and value
      let paramType = this.getColumnType(key);

      // For array-based operators, use Array() type wrapper
      const arrayOperators = ['IN', 'NOT IN', 'GLOBAL IN', 'GLOBAL NOT IN'];
      if (arrayOperators.includes(operator) && Array.isArray(actualValue)) {
        paramType = `Array(${paramType})`;
      }

      return `${key} ${operator} {${paramName}:${paramType}}`;
    };

    const clauses = conditions.map((condition) => buildSingleCondition(condition)).join(' AND ');

    return { clause: clauses ? `WHERE ${clauses}` : '', params };
  }

  protected async insert(
    data: Omit<InferClickhouseSchemaType<T_Schema>, 'id' | 'expires_at'>,
    context: {
      organizationId?: string;
      environmentId?: string;
      userId?: string;
    },
    options: InsertOptions
  ): Promise<void> {
    const id = `${this.identifierPrefix}${generateObjectId()}`;
    const expirationDate = await this.getExpirationDate(context);
    const expiresAt = LogRepository.formatDateTime64(expirationDate);

    await this.clickhouseService.insert(this.table, [{ ...data, id, expires_at: expiresAt }], options);
  }

  protected async insertMany(
    data: Omit<InferClickhouseSchemaType<T_Schema>, 'id' | 'expires_at'>[],
    context: {
      organizationId?: string;
      environmentId?: string;
      userId?: string;
    },
    options: InsertOptions
  ): Promise<void> {
    const ids = data.map((item) => `${this.identifierPrefix}${generateObjectId()}`);
    const expirationDate = await this.getExpirationDate(context);
    const expiresAt = LogRepository.formatDateTime64(expirationDate);

    await this.clickhouseService.insert(
      this.table,
      data.map((item, index) => ({ ...item, id: ids[index], expires_at: expiresAt })),
      options
    );
  }

  // Query methods with mandatory tenant enforcement
  async find(options: {
    where: Where<T_Enhanced_Type>;
    limit?: number;
    offset?: number;
    // todo make a type validation for available orderBy columns
    orderBy?: SchemaKeys<T_Schema>;
    orderDirection?: 'ASC' | 'DESC';
    useFinal?: boolean;
  }): Promise<{ data: T_Enhanced_Type[]; rows: number }> {
    const { where, limit = 100, offset = 0, orderBy, orderDirection = 'DESC', useFinal = false } = options;

    if (limit < 0 || limit > LIMIT_MAX_THRESHOLD) {
      throw new Error(`Limit must be between 0 and ${LIMIT_MAX_THRESHOLD}`);
    }
    if (offset < 0) {
      throw new Error('Offset must be non-negative');
    }

    const { clause, params } = this.buildWhereClause(where);

    if (orderBy) {
      this.validateColumnName(String(orderBy));

      if (!this.schemaOrderBy.includes(orderBy)) {
        this.logger.warn(
          {
            orderBy,
            schemaOrderBy: this.schemaOrderBy,
          },
          `Column '${orderBy as string}' cannot be used for ordering. Available columns: ${this.schemaOrderBy.join(', ')}`
        );
      }
    }

    if (orderDirection && !ORDER_DIRECTION.includes(orderDirection)) {
      throw new Error(`Invalid order direction: ${orderDirection}. Allowed directions: ${ORDER_DIRECTION.join(', ')}`);
    }

    const finalModifier = useFinal ? ' FINAL' : '';
    const query = `
      SELECT *
      FROM ${this.table}${finalModifier}
      ${clause}
      ${orderBy ? `ORDER BY ${String(orderBy)} ${orderDirection}` : ''}
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const result = await this.clickhouseService.query<T_Enhanced_Type>({
      query,
      params,
    });

    return result;
  }

  async findOne(options: {
    where: Where<T_Enhanced_Type>;
    limit?: number;
    offset?: number;
    orderBy?: SchemaKeys<T_Schema>;
    orderDirection?: 'ASC' | 'DESC';
    useFinal?: boolean;
  }): Promise<{ data: T_Enhanced_Type; rows: number }> {
    const result = await this.find({ ...options, limit: 1 });

    return { data: result.data[0], rows: result.rows };
  }

  async count(options: { where: Where<T_Enhanced_Type> }): Promise<number> {
    const { where } = options;
    const { clause, params } = this.buildWhereClause(where);

    const query = `
      SELECT toInt64(count()) as total
      FROM ${this.table}
      ${clause}
    `;

    const result = await this.clickhouseService.query<{ total: number | string }>({
      query,
      params,
    });

    const total = result.data[0]?.total;

    return Number(total || 0);
  }

  static formatDateTime64(date: Date) {
    // Use toISOString() to get UTC time, then format for ClickHouse
    const isoString = date.toISOString();

    // Remove the 'Z' suffix since ClickHouse DateTime64 with UTC timezone handles it
    return isoString.slice(0, -1) as unknown as Date;
  }
}

/**
 * Optional fluent query builder for better ergonomics
 *
 * @example Basic usage with OR conditions:
 * ```typescript
 * // Using the fluent callback approach
 * const query1 = new QueryBuilder<WorkflowRun>({ environmentId: 'env123' })
 *   .whereEquals('organization_id', 'org456')
 *   .whereIn('status', ['pending', 'running'])
 *   .or(builder => {
 *     builder
 *       .whereLike('channels', '%email%')
 *       .whereLike('channels', '%sms%');
 *   })
 *   .build();
 *
 * // Using the direct array approach
 * const query2 = new QueryBuilder<WorkflowRun>({ environmentId: 'env123' })
 *   .whereEquals('organization_id', 'org456')
 *   .orWhere([
 *     { field: 'priority', operator: '=', value: 'high' },
 *     { field: 'urgent', operator: '=', value: true }
 *   ])
 *   .build();
 *
 * // Both generate ClickHouse SQL with proper parameter binding:
 * // query1: WHERE environment_id = 'env123' AND organization_id = 'org456'
 * //           AND status IN ['pending', 'running']
 * //           AND (channels LIKE '%email%' OR channels LIKE '%sms%')
 * // query2: WHERE environment_id = 'env123' AND organization_id = 'org456'
 * //           AND (priority = 'high' OR urgent = true)
 * ```
 *
 * @example Real-world usage (from GetWorkflowRuns use case):
 * ```typescript
 * const queryBuilder = new QueryBuilder<WorkflowRun>({ environmentId: 'env123' })
 *   .whereEquals('organization_id', 'org456')
 *   .whereIn('status', ['completed', 'failed'])
 *   .whereGreaterThanOrEqual('created_at', new Date('2024-01-01'))
 *   .orWhere(
 *     channels.map(channel => ({
 *       field: 'channels',
 *       operator: 'LIKE',
 *       value: `%"${channel}"%`
 *     }))
 *   );
 *
 * const where = queryBuilder.build();
 * const result = await repository.find({ where, limit: 100 });
 *
 * // Generates SQL:
 * // WHERE environment_id = 'env123'
 * //   AND organization_id = 'org456'
 * //   AND status IN ['completed', 'failed']
 * //   AND created_at >= '2024-01-01T00:00:00.000'
 * //   AND (channels LIKE '%"email"%' OR channels LIKE '%"sms"%' OR channels LIKE '%"push"%')
 * ```
 */
export class QueryBuilder<T> {
  private conditions: WhereCondition<T>[] = [];

  constructor(private enforced: EnforcedContext) {}

  where<K extends keyof T, O extends ClickhouseOperator>(
    field: K,
    operator: O,
    value: O extends ArrayOperators ? T[K][] : T[K]
  ): this {
    this.conditions.push({ field, operator, value } as WhereCondition<T>);

    return this;
  }

  whereEquals<K extends keyof T>(field: K, value: T[K]): this {
    return this.where(field, '=', value);
  }

  whereIn<K extends keyof T>(field: K, values: T[K][]): this {
    return this.where(field, 'IN', values);
  }

  whereNotIn<K extends keyof T>(field: K, values: T[K][]): this {
    return this.where(field, 'NOT IN', values);
  }

  whereLike<K extends keyof T>(field: K, value: T[K]): this {
    return this.where(field, 'LIKE', value);
  }

  whereGreaterThan<K extends keyof T>(field: K, value: T[K]): this {
    return this.where(field, '>', value);
  }

  whereGreaterThanOrEqual<K extends keyof T>(field: K, value: T[K]): this {
    return this.where(field, '>=', value);
  }

  whereLessThan<K extends keyof T>(field: K, value: T[K]): this {
    return this.where(field, '<', value);
  }

  whereLessThanOrEqual<K extends keyof T>(field: K, value: T[K]): this {
    return this.where(field, '<=', value);
  }

  whereBetween<K extends keyof T>(field: K, min: T[K], max: T[K]): this {
    this.where(field, '>=', min);
    this.where(field, '<=', max);

    return this;
  }

  /**
   * Add an OR condition using a callback to build the OR conditions
   * @param callback Function that receives a new QueryBuilder instance to build OR conditions
   *
   * @example
   * ```typescript
   * const query = new QueryBuilder<WorkflowRun>({ environmentId: 'env123' })
   *   .whereEquals('status', 'active')
   *   .or(builder => {
   *     builder
   *       .whereEquals('priority', 'high')
   *       .whereEquals('priority', 'urgent');
   *   })
   *   .build();
   *
   * // Generates SQL:
   * // WHERE environment_id = 'env123'
   * //   AND status = 'active'
   * //   AND (priority = 'high' OR priority = 'urgent')
   * ```
   */
  or(callback: (builder: Omit<QueryBuilder<T>, 'build' | 'or'>) => void): this {
    const orBuilder = new QueryBuilder<T>(this.enforced);
    callback(orBuilder);

    if (orBuilder.conditions.length > 0) {
      const orCondition: OrCondition<T> = {
        $or: orBuilder.conditions,
      };
      this.conditions.push(orCondition);
    }

    return this;
  }

  /**
   * Add a simple OR condition with field, operator, and value
   * @param orConditions Array of OR conditions to add
   *
   * @example
   * ```typescript
   * const query = new QueryBuilder<WorkflowRun>({ environmentId: 'env123' })
   *   .whereEquals('organization_id', 'org456')
   *   .orWhere([
   *     { field: 'status', operator: '=', value: 'completed' },
   *     { field: 'status', operator: '=', value: 'failed' }
   *   ])
   *   .orWhere([
   *     { field: 'channels', operator: 'LIKE', value: '%email%' },
   *     { field: 'channels', operator: 'LIKE', value: '%sms%' }
   *   ])
   *   .build();
   *
   * // Generates SQL:
   * // WHERE environment_id = 'env123'
   * //   AND organization_id = 'org456'
   * //   AND (status = 'completed' OR status = 'failed')
   * //   AND (channels LIKE '%email%' OR channels LIKE '%sms%')
   * ```
   *
   * @example Array operators (IN, NOT IN):
   * ```typescript
   * const query = new QueryBuilder<WorkflowRun>({ environmentId: 'env123' })
   *   .orWhere([
   *     { field: 'workflow_id', operator: 'IN', value: ['wf1', 'wf2'] },
   *     { field: 'status', operator: '=', value: 'urgent' }
   *   ])
   *   .build();
   *
   * // Generates SQL:
   * // WHERE environment_id = 'env123'
   * //   AND (workflow_id IN ['wf1', 'wf2'] OR status = 'urgent')
   * ```
   */
  orWhere<K extends keyof T, O extends ClickhouseOperator>(
    orConditions: Array<{
      field: K;
      operator: O;
      value: O extends ArrayOperators ? T[K][] : T[K];
    }>
  ): this {
    if (orConditions.length > 0) {
      const conditions: WhereCondition<T>[] = orConditions.map(
        ({ field, operator, value }) =>
          ({
            field,
            operator,
            value,
          }) as WhereCondition<T>
      );

      const orCondition: OrCondition<T> = {
        $or: conditions,
      };
      this.conditions.push(orCondition);
    }

    return this;
  }

  build(): EnforcedWhere<T> {
    return {
      enforced: this.enforced,
      conditions: this.conditions,
    };
  }
}
