import { PinoLogger } from 'nestjs-pino';
import { ClickhouseSchema, InferClickhouseSchemaType } from 'clickhouse-schema';
import { ClickHouseService } from './clickhouse.service';

export type ClickhouseOperator =
  | '='
  | '=='
  | '!='
  | '<>'
  | '<='
  | '>='
  | '<'
  | '>'
  | 'LIKE'
  | 'NOT LIKE'
  | 'ILIKE'
  | 'IN'
  | 'NOT IN'
  | 'GLOBAL IN'
  | 'GLOBAL NOT IN';

export type Where<T> = {
  [K in keyof T]?: T[K] | { operator: ClickhouseOperator; value: T[K] | T[K][] };
};

export abstract class BaseRepository<T extends ClickhouseSchema<any>> {
  abstract readonly table: string;
  abstract readonly schema: T;

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

  private buildWhereClause(where: Where<InferClickhouseSchemaType<T>>): {
    clause: string;
    params: Record<string, any>;
  } {
    const params: Record<string, any> = {};
    const clauses = Object.entries(where)
      .map(([key, value], index) => {
        let operator: ClickhouseOperator = '=';
        let actualValue = value;

        if (typeof value === 'object' && value !== null && 'operator' in value && 'value' in value) {
          operator = value.operator;
          actualValue = value.value;
        }

        const paramName = `${key.replace(/[^a-zA-Z0-9_]/g, '')}${index}`;
        params[paramName] = actualValue;

        return `${key} ${operator} {${paramName}:${this.getColumnType(key)}}`;
      })
      .join(' AND ');

    return { clause: clauses ? `WHERE ${clauses}` : '', params };
  }

  async insert(data: InferClickhouseSchemaType<T>): Promise<void> {
    await this.clickhouseService.insert(this.table, [data]);
  }

  async insertMany(data: InferClickhouseSchemaType<T>[]): Promise<void> {
    await this.clickhouseService.insert(this.table, data);
  }

  async find(options: {
    where: Where<InferClickhouseSchemaType<T>>;
    limit?: number;
    offset?: number;
    orderBy?: keyof InferClickhouseSchemaType<T>;
    orderDirection?: 'ASC' | 'DESC';
  }): Promise<{ data: InferClickhouseSchemaType<T>[]; rows: number }> {
    const { where, limit = 100, offset = 0, orderBy, orderDirection = 'DESC' } = options;
    const { clause, params } = this.buildWhereClause(where);

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
