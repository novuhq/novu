import { PinoLogger } from 'nestjs-pino';
import { ZodSchema, z } from 'zod';
import { ClickHouseService } from './clickhouse.service';

export type Where<T> = {
  [K in keyof T]?: T[K] | { operator: string; value: T[K] | T[K][] };
};

export abstract class BaseRepository<T extends ZodSchema> {
  abstract readonly table: string;
  abstract readonly schema: T;

  constructor(
    protected readonly clickhouseService: ClickHouseService,
    protected readonly logger: PinoLogger
  ) {}

  private getColumnType(column: string): string {
    if (this.schema instanceof z.ZodObject) {
      const shape = this.schema.shape as Record<string, z.ZodTypeAny>;
      const field = shape[column];

      if (field && field.description) {
        return field.description;
      }
    }

    return 'String';
  }

  private buildWhereClause(where: Where<z.infer<T>>): { clause: string; params: Record<string, any> } {
    const params: Record<string, any> = {};
    const clauses = Object.entries(where)
      .map(([key, value], index) => {
        let operator = '=';
        let actualValue = value;

        if (typeof value === 'object' && value !== null && 'operator' in value && 'value' in value) {
          operator = String(value.operator);
          actualValue = value.value;
        }

        const paramName = `${key.replace(/[^a-zA-Z0-9_]/g, '')}${index}`;
        params[paramName] = actualValue;

        return `${key} ${operator} {${paramName}:${this.getColumnType(key)}}`;
      })
      .join(' AND ');

    return { clause: clauses ? `WHERE ${clauses}` : '', params };
  }

  async insert(data: z.infer<T>): Promise<void> {
    const parsedData = this.schema.parse(data);
    await this.clickhouseService.insert(this.table, [parsedData]);
  }

  async insertMany(data: z.infer<T>[]): Promise<void> {
    const parsedData = this.schema.array().parse(data);
    await this.clickhouseService.insert(this.table, parsedData);
  }

  async find(options: {
    where: Where<z.infer<T>>;
    limit?: number;
    offset?: number;
    orderBy?: keyof z.infer<T>;
    orderDirection?: 'ASC' | 'DESC';
  }): Promise<{ data: z.infer<T>[]; rows: number }> {
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

    const result = await this.clickhouseService.query<z.infer<T>>({
      query,
      params,
    });

    const validation = this.schema.array().safeParse(result.data);

    if (!validation.success) {
      this.logger.warn(
        {
          error: validation.error,
        },
        'Data from ClickHouse did not match schema'
      );
    }

    return {
      data: validation.success ? validation.data : result.data,
      rows: result.rows,
    };
  }

  async count(options: { where: Where<z.infer<T>> }): Promise<number> {
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
