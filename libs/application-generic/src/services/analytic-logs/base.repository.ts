import { PinoLogger } from 'nestjs-pino';
import { ClickhouseSchema, InferClickhouseSchemaType } from 'clickhouse-schema';
import { ClickHouseService } from './clickhouse.service';
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

export abstract class BaseRepository<T extends ClickhouseSchema<any>> {
  abstract readonly table: string;
  abstract readonly schema: T;
  abstract readonly schemaOrderBy: SchemaKeys<T>[];
  abstract readonly identifierPrefix: string;

  constructor(
    protected readonly clickhouseService: ClickHouseService,
    protected readonly logger: PinoLogger
  ) {}

  private getColumnType(column: string): string {
    const columnSchema = this.schema.schema[column];
    if (columnSchema && columnSchema.type) {
      return columnSchema.type.toString();
    }

    return 'String';
  }

  private validateColumnName(columnName: SchemaKeys<T>): void {
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
  private buildWhereClause(where: Where<InferClickhouseSchemaType<T>>): {
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

  async insert(data: Omit<InferClickhouseSchemaType<T>, 'id'>): Promise<void> {
    const id = `${this.identifierPrefix}${generateObjectId()}`;
    await this.clickhouseService.insert(this.table, [{ ...data, id }]);
  }

  async insertMany(data: Omit<InferClickhouseSchemaType<T>, 'id'>[]): Promise<void> {
    const ids = data.map((item) => `${this.identifierPrefix}${generateObjectId()}`);
    await this.clickhouseService.insert(
      this.table,
      data.map((item, index) => ({ ...item, id: ids[index] }))
    );
  }

  async find(options: {
    where: Where<InferClickhouseSchemaType<T>>;
    limit?: number;
    offset?: number;
    orderBy?: SchemaKeys<T>;
    orderDirection?: 'ASC' | 'DESC';
  }): Promise<{ data: InferClickhouseSchemaType<T>[]; rows: number }> {
    const { where, limit = 100, offset = 0, orderBy, orderDirection = 'DESC' } = options;

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
        throw new Error(
          `Column '${orderBy as string}' cannot be used for ordering. Available columns: ${this.schemaOrderBy.join(', ')}`
        );
      }
    }

    if (orderDirection && !ORDER_DIRECTION.includes(orderDirection)) {
      throw new Error(`Invalid order direction: ${orderDirection}. Allowed directions: ${ORDER_DIRECTION.join(', ')}`);
    }

    const query = `
      SELECT *
      FROM ${this.table}
      ${clause}
      ${orderBy ? `ORDER BY ${String(orderBy)} ${orderDirection}` : ''}
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const result = await this.clickhouseService.query<InferClickhouseSchemaType<T>>({
      query,
      params,
    });

    return result;
  }

  async count(options: { where: Where<InferClickhouseSchemaType<T>> }): Promise<number> {
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
}
