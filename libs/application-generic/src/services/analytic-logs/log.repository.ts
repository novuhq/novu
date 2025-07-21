import { PinoLogger } from 'nestjs-pino';
import { ClickhouseSchema, InferClickhouseSchemaType } from 'clickhouse-schema';
import { addDays } from 'date-fns';

import { FeatureFlagsKeysEnum } from '@novu/shared';

import { ClickHouseService, InsertOptions } from './clickhouse.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { generateObjectId } from '../../utils/generate-id';

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

export type Where<T> = {
  [K in keyof T]?: T[K] | { operator: ClickhouseOperator; value: T[K] | T[K][] };
};

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
   * @param where - Object mapping column names to values or {operator, value} objects
   * @returns Object with SQL WHERE clause string and parameter map for safe query execution
   * @example
   * Input: { user_id: 123, name: { operator: 'LIKE', value: 'John%' } }
   * Output: {
   *   clause: "WHERE user_id = {param_0_userid:String} AND name LIKE {param_1_name:String}",
   *   params: { param_0_userid: 123, param_1_name: 'John%' }
   * }
   */
  private buildWhereClause(where: Where<InferClickhouseSchemaType<T_Schema>>): {
    clause: string;
    params: Record<string, any>;
  } {
    const params: Record<string, any> = {};
    const clauses = Object.entries(where)
      .map(([key, value], index) => {
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
        this.logger.error(
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
