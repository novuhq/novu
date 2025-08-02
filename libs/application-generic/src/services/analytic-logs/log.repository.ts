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

// Generate the type from the const array - this ensures single source of truth
export type ClickhouseOperator = (typeof CLICKHOUSE_OPERATORS)[number];

// Export the array for runtime validation
export const ALLOWED_OPERATORS: readonly ClickhouseOperator[] = CLICKHOUSE_OPERATORS;

const LIMIT_MAX_THRESHOLD = 1000;
export const ORDER_DIRECTION = ['ASC', 'DESC'];

// Legacy types for backward compatibility
export type WhereCondition<T> = {
  [K in keyof T]: { [P in K]: T[P] | { operator: ClickhouseOperator; value: T[P] | T[P][] } };
}[keyof T];

export type Where<T> = WhereCondition<T>[];

// New enhanced types for tenant-safe querying
export interface TenantContext {
  organizationId: string;
  environmentId: string;
  userId?: string; // Optional for some schemas
}

export interface SafeWhereCondition<T> {
  field: keyof T;
  operator: ClickhouseOperator;
  value: T[keyof T] | T[keyof T][];
}

export interface EnforcedWhere<T> {
  tenant: TenantContext;
  conditions?: SafeWhereCondition<T>[];
}

// For backward compatibility and advanced use cases
export interface UnsafeWhere<T> {
  conditions: SafeWhereCondition<T>[];
  __unsafe: true; // Explicit opt-in to bypass enforcement
}

export type SafeWhere<T> = EnforcedWhere<T> | UnsafeWhere<T>;

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
    } catch (error) {
      this.logger.error('Failed to create ClickHouse table', error);
    }
  }

  private getColumnType(column: string): string {
    const columnSchema = this.schema.schema[column];
    if (columnSchema && columnSchema.type) {
      return columnSchema.type.toString();
    }

    return 'String';
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

  /**
   * Builds a WHERE clause with parameterized values for ClickHouse queries.
   * @param where - Array of condition objects, each with a single property mapping column names to values or {operator, value} objects
   * @returns Object with SQL WHERE clause string and parameter map for safe query execution
   * @example
   * Input: [
   *   { user_id: 123 },
   *   { name: { operator: 'LIKE', value: 'John%' } },
   *   { age: { operator: '>', value: 18 } },
   *   { age: { operator: '<', value: 65 } }
   * ]
   * Output: {
   *   clause: "WHERE user_id = {param_0_userid:String} AND name LIKE {param_1_name:String} AND age > {param_2_age:String} AND age < {param_3_age:String}",
   *   params: { param_0_userid: 123, param_1_name: 'John%', param_2_age: 18, param_3_age: 65 }
   * }
   */
  protected buildWhereClause(where: Where<InferClickhouseSchemaType<T_Schema>>): {
    clause: string;
    params: Record<string, any>;
  } {
    const params: Record<string, any> = {};
    const clauses = where
      .map((condition, index) => {
        const entries = Object.entries(condition);
        if (entries.length !== 1) {
          throw new Error('Each where condition must have exactly one property');
        }

        const [key, value] = entries[0];
        this.validateColumnName(key);

        let operator: ClickhouseOperator = '=';
        let actualValue = value;

        if (typeof value === 'object' && value !== null && 'operator' in value && 'value' in value) {
          operator = value.operator;
          actualValue = value.value;
        }

        this.validateOperator(operator);

        const paramName = `param_${index}_${key.replace(/[^a-zA-Z0-9]/g, '')}`;

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
      })
      .join(' AND ');

    return { clause: clauses ? `WHERE ${clauses}` : '', params };
  }

  /**
   * Build WHERE clause with mandatory tenant enforcement
   */
  protected buildSafeWhereClause(where: SafeWhere<InferClickhouseSchemaType<T_Schema>>): {
    clause: string;
    params: Record<string, any>;
  } {
    let allConditions: SafeWhereCondition<InferClickhouseSchemaType<T_Schema>>[] = [];

    if ('__unsafe' in where) {
      // Unsafe mode - log for monitoring but allow
      this.logger.warn('Using unsafe WHERE clause without tenant enforcement', {
        table: this.table,
        conditionsCount: where.conditions.length,
      });
      allConditions = where.conditions;
    } else {
      // Safe mode - enforce tenant context
      const tenantConditions = this.buildTenantConditions(where.tenant);
      allConditions = [...tenantConditions, ...(where.conditions || [])];
    }

    return this.buildWhereClauseFromConditions(allConditions);
  }

  /**
   * Build mandatory tenant isolation conditions
   */
  private buildTenantConditions(tenant: TenantContext): SafeWhereCondition<InferClickhouseSchemaType<T_Schema>>[] {
    const conditions: SafeWhereCondition<InferClickhouseSchemaType<T_Schema>>[] = [
      {
        field: 'organization_id' as keyof InferClickhouseSchemaType<T_Schema>,
        operator: '=',
        value: tenant.organizationId,
      },
      {
        field: 'environment_id' as keyof InferClickhouseSchemaType<T_Schema>,
        operator: '=',
        value: tenant.environmentId,
      },
    ];

    // Add user_id if provided and schema supports it
    if (tenant.userId && this.schema.schema['user_id']) {
      conditions.push({
        field: 'user_id' as keyof InferClickhouseSchemaType<T_Schema>,
        operator: '=',
        value: tenant.userId,
      });
    }

    return conditions;
  }

  /**
   * Convert conditions array to SQL WHERE clause
   */
  private buildWhereClauseFromConditions(
    conditions: SafeWhereCondition<InferClickhouseSchemaType<T_Schema>>[]
  ): {
    clause: string;
    params: Record<string, any>;
  } {
    const params: Record<string, any> = {};
    const clauses = conditions
      .map((condition, index) => {
        this.validateColumnName(String(condition.field));
        this.validateOperator(condition.operator);

        const paramName = `param_${index}_${String(condition.field).replace(/[^a-zA-Z0-9]/g, '')}`;

        if (condition.value === null || condition.value === undefined) {
          throw new Error(`Invalid value for column '${String(condition.field)}': value cannot be null or undefined`);
        }

        params[paramName] = condition.value;

        let paramType = this.getColumnType(String(condition.field));
        const arrayOperators = ['IN', 'NOT IN', 'GLOBAL IN', 'GLOBAL NOT IN'];
        if (arrayOperators.includes(condition.operator) && Array.isArray(condition.value)) {
          paramType = `Array(${paramType})`;
        }

        return `${String(condition.field)} ${condition.operator} {${paramName}:${paramType}}`;
      })
      .join(' AND ');

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

  async findOne(options: {
    where: Where<InferClickhouseSchemaType<T_Schema>>;
    limit?: number;
    offset?: number;
    // todo make a type validation for available orderBy columns
    orderBy?: SchemaKeys<T_Schema>;
    orderDirection?: 'ASC' | 'DESC';
    useFinal?: boolean;
  }): Promise<{ data: T_Enhanced_Type; rows: number }> {
    const result = await this.find({ ...options, limit: 1 });

    return { data: result.data[0], rows: result.rows };
  }

  // Enhanced query methods with tenant enforcement
  async findSafe(options: {
    where: SafeWhere<InferClickhouseSchemaType<T_Schema>>;
    limit?: number;
    offset?: number;
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

    const { clause, params } = this.buildSafeWhereClause(where);

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

  async findOneSafe(options: {
    where: SafeWhere<InferClickhouseSchemaType<T_Schema>>;
    limit?: number;
    offset?: number;
    orderBy?: SchemaKeys<T_Schema>;
    orderDirection?: 'ASC' | 'DESC';
    useFinal?: boolean;
  }): Promise<{ data: T_Enhanced_Type; rows: number }> {
    const result = await this.findSafe({ ...options, limit: 1 });

    return { data: result.data[0], rows: result.rows };
  }

  async countSafe(options: { where: SafeWhere<InferClickhouseSchemaType<T_Schema>> }): Promise<number> {
    const { where } = options;
    const { clause, params } = this.buildSafeWhereClause(where);

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

  // Legacy methods for backward compatibility
  async find(options: {
    where: Where<InferClickhouseSchemaType<T_Schema>>;
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

  async count(options: { where: Where<InferClickhouseSchemaType<T_Schema>> }): Promise<number> {
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
 */
export class QueryBuilder<T> {
  private conditions: SafeWhereCondition<T>[] = [];

  constructor(private tenant: TenantContext) {}

  where(field: keyof T, operator: ClickhouseOperator, value: any): this {
    this.conditions.push({ field, operator, value });

    return this;
  }

  whereEquals(field: keyof T, value: any): this {
    return this.where(field, '=', value);
  }

  whereIn(field: keyof T, values: any[]): this {
    return this.where(field, 'IN', values);
  }

  whereNotIn(field: keyof T, values: any[]): this {
    return this.where(field, 'NOT IN', values);
  }

  whereLike(field: keyof T, value: string): this {
    return this.where(field, 'LIKE', value);
  }

  whereGreaterThan(field: keyof T, value: any): this {
    return this.where(field, '>', value);
  }

  whereGreaterThanOrEqual(field: keyof T, value: any): this {
    return this.where(field, '>=', value);
  }

  whereLessThan(field: keyof T, value: any): this {
    return this.where(field, '<', value);
  }

  whereLessThanOrEqual(field: keyof T, value: any): this {
    return this.where(field, '<=', value);
  }

  whereBetween(field: keyof T, min: any, max: any): this {
    this.where(field, '>=', min);
    this.where(field, '<=', max);

    return this;
  }

  build(): EnforcedWhere<T> {
    return {
      tenant: this.tenant,
      conditions: this.conditions,
    };
  }
}
