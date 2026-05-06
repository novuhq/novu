import { DirectionEnum } from '@novu/shared';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import {
  ClientSession,
  FilterQuery,
  Model,
  mongo,
  QueryOptions,
  QueryWithHelpers,
  SortOrder,
  Types,
  UpdateQuery,
} from 'mongoose';
import { DalException } from '../shared';
import {
  convertObjectIds,
  convertSelectToProjection,
  IncludedKeys,
  SelectFieldsObject,
  SelectInput,
} from './projection.types';

// ---------------------------------------------------------------------------
// Options interfaces
// ---------------------------------------------------------------------------

export interface FindOneOptionsV2<T_DBModel> {
  readPreference?: 'secondaryPreferred' | 'primary';
  query?: QueryOptions<T_DBModel>;
  session?: ClientSession | null;
}

export interface FindOptionsV2<T_MappedEntity> {
  limit?: number;
  sort?: Partial<Record<keyof T_MappedEntity & string, 1 | -1>>;
  skip?: number;
  session?: ClientSession | null;
  readPreference?: 'secondaryPreferred' | 'primary';
}

export interface FindWithCursorPaginationOptionsV2<T_DBModel, T_Select = undefined> {
  query?: FilterQuery<T_DBModel>;
  limit: number;
  before?: { sortBy: string; paginateField: any };
  after?: { sortBy: string; paginateField: any };
  sortBy: string;
  sortDirection?: DirectionEnum;
  paginateField: string;
  enhanceQuery?: (query: QueryWithHelpers<Array<T_DBModel>, T_DBModel>) => any;
  includeCursor?: boolean;
  /**
   * Fields to include in the result documents.
   * Accepts an array of entity keys or a Mongoose-style object projection.
   * The pagination fields (`sortBy`, `paginateField`) are silently injected
   * so the method always has access to them for cursor computation — the
   * caller does not need to include them.
   */
  select: T_Select;
}

interface IWriteOptions {
  writeConcern?: number | 'majority';
}

// ---------------------------------------------------------------------------
// BaseRepositoryV2
// ---------------------------------------------------------------------------

/**
 * Type-safe base repository for new DAL repositories.
 *
 * Key differences from the deprecated BaseRepository:
 * - `select` is **required** on all read methods — no accidental SELECT *
 * - Return types are automatically inferred from the `select` input via `Pick<Entity, Keys>`
 * - `.lean()` is used on all reads (no Mongoose document hydration)
 * - ObjectId-to-string conversion is done via a targeted traversal rather than a JSON round-trip
 * - `findById` is built into the base class
 * - Sort options are typed as `Partial<Record<keyof Entity, 1 | -1>>` instead of `any`
 * - Constructor accepts an optional `defaultReadPreference` for read-heavy repositories
 *
 * @example
 * ```ts
 * export class WidgetRepository extends BaseRepositoryV2<WidgetDBModel, WidgetEntity, EnforceEnvOrOrgIds> {
 *   constructor() { super(Widget, WidgetEntity); }
 *
 *   async findActive(environmentId: string) {
 *     return this.find(
 *       { _environmentId: environmentId, isActive: true },
 *       ['_id', 'name', 'config'],
 *       //  ^? Pick<WidgetEntity, '_id' | 'name' | 'config'>[]
 *     );
 *   }
 * }
 * ```
 */
export class BaseRepositoryV2<T_DBModel, T_MappedEntity, T_Enforcement> {
  private readonly _model: Model<T_DBModel>;

  private readonly defaultReadPreference: 'secondaryPreferred' | 'primary';

  constructor(
    protected MongooseModel: Model<T_DBModel>,
    protected entity: ClassConstructor<T_MappedEntity>,
    options?: { defaultReadPreference?: 'secondaryPreferred' | 'primary' }
  ) {
    this._model = MongooseModel;
    this.defaultReadPreference = options?.defaultReadPreference ?? 'primary';
  }

  // ---------------------------------------------------------------------------
  // Static helpers (mirrored from BaseRepository)
  // ---------------------------------------------------------------------------

  public static createObjectId() {
    return new Types.ObjectId().toString();
  }

  public static isInternalId(id: string) {
    const isValidMongoId = Types.ObjectId.isValid(id);
    if (!isValidMongoId) return false;

    return id === new Types.ObjectId(id).toString();
  }

  protected convertObjectIdToString(value: Types.ObjectId): string {
    return value.toString();
  }

  protected convertStringToObjectId(value: string): Types.ObjectId {
    return new Types.ObjectId(value);
  }

  // ---------------------------------------------------------------------------
  // Context key helpers (mirrored from BaseRepository)
  // ---------------------------------------------------------------------------

  public buildContextExactMatchQuery(
    contextKeys?: string[],
    options?: { enabled?: boolean; strictEmpty?: boolean }
  ): Record<string, unknown> {
    const { enabled = true, strictEmpty = false } = options ?? {};

    if (!enabled) return {};

    if (contextKeys === undefined || contextKeys.length === 0) {
      if (strictEmpty) return { contextKeys: [] };

      return { $or: [{ contextKeys: { $exists: false } }, { contextKeys: [] }] };
    }

    const sortedKeys = [...contextKeys].sort();

    return { contextKeys: { $all: sortedKeys, $size: sortedKeys.length } };
  }

  // ---------------------------------------------------------------------------
  // Count / aggregate
  // ---------------------------------------------------------------------------

  async count(
    query: FilterQuery<T_DBModel> & T_Enforcement,
    limit?: number,
    readPreference?: 'secondaryPreferred' | 'primary'
  ): Promise<number> {
    return this.MongooseModel.countDocuments(query, {
      limit,
      readPreference: readPreference ?? this.defaultReadPreference,
    });
  }

  async estimatedDocumentCount(): Promise<number> {
    return this.MongooseModel.estimatedDocumentCount();
  }

  async aggregate(query: any[], options: { readPreference?: 'secondaryPreferred' | 'primary' } = {}): Promise<any> {
    return this.MongooseModel.aggregate(query).read(options.readPreference ?? this.defaultReadPreference);
  }

  // ---------------------------------------------------------------------------
  // findOne overloads
  //   Overload 1: array syntax  — _id implicitly included by MongoDB
  //   Overload 2: object with _id:0 — explicit _id exclusion
  //   Overload 3: object without _id:0 — _id implicitly included
  // ---------------------------------------------------------------------------

  async findOne<K extends keyof T_MappedEntity & string>(
    query: FilterQuery<T_DBModel> & T_Enforcement,
    select: readonly K[],
    options?: FindOneOptionsV2<T_DBModel>
  ): Promise<Pick<T_MappedEntity, K> | null>;

  async findOne<S extends SelectFieldsObject<T_MappedEntity> & { _id: 0 }>(
    query: FilterQuery<T_DBModel> & T_Enforcement,
    select: S,
    options?: FindOneOptionsV2<T_DBModel>
  ): Promise<Pick<T_MappedEntity, Exclude<IncludedKeys<S, T_MappedEntity>, '_id'>> | null>;

  async findOne<S extends SelectFieldsObject<T_MappedEntity>>(
    query: FilterQuery<T_DBModel> & T_Enforcement,
    select: S,
    options?: FindOneOptionsV2<T_DBModel>
  ): Promise<Pick<
    T_MappedEntity,
    IncludedKeys<S, T_MappedEntity> | ('_id' extends keyof T_MappedEntity ? '_id' : never)
  > | null>;

  async findOne(
    query: FilterQuery<T_DBModel> & T_Enforcement,
    select: '*',
    options?: FindOneOptionsV2<T_DBModel>
  ): Promise<T_MappedEntity | null>;

  async findOne(
    query: FilterQuery<T_DBModel> & T_Enforcement,
    select: SelectInput<T_MappedEntity> | '*',
    options: FindOneOptionsV2<T_DBModel> = {}
  ): Promise<any> {
    const { session, query: queryOpts, readPreference } = options;
    const projection = convertSelectToProjection(select);

    const builder = this.MongooseModel.findOne(query, projection, queryOpts)
      .read(readPreference ?? this.defaultReadPreference)
      .lean();

    if (session) builder.session(session);

    const data = await builder.exec();
    if (!data) return null;

    return this.mapProjectedEntity(data);
  }

  // ---------------------------------------------------------------------------
  // findById overloads (same projection semantics as findOne)
  // ---------------------------------------------------------------------------

  async findById<K extends keyof T_MappedEntity & string>(
    query: { _id: string } & T_Enforcement,
    select: readonly K[],
    options?: FindOneOptionsV2<T_DBModel>
  ): Promise<Pick<T_MappedEntity, K> | null>;

  async findById<S extends SelectFieldsObject<T_MappedEntity> & { _id: 0 }>(
    query: { _id: string } & T_Enforcement,
    select: S,
    options?: FindOneOptionsV2<T_DBModel>
  ): Promise<Pick<T_MappedEntity, Exclude<IncludedKeys<S, T_MappedEntity>, '_id'>> | null>;

  async findById<S extends SelectFieldsObject<T_MappedEntity>>(
    query: { _id: string } & T_Enforcement,
    select: S,
    options?: FindOneOptionsV2<T_DBModel>
  ): Promise<Pick<
    T_MappedEntity,
    IncludedKeys<S, T_MappedEntity> | ('_id' extends keyof T_MappedEntity ? '_id' : never)
  > | null>;

  async findById(
    query: { _id: string } & T_Enforcement,
    select: '*',
    options?: FindOneOptionsV2<T_DBModel>
  ): Promise<T_MappedEntity | null>;

  async findById(
    query: { _id: string } & T_Enforcement,
    select: SelectInput<T_MappedEntity> | '*',
    options?: FindOneOptionsV2<T_DBModel>
  ): Promise<any> {
    return this.findOne(query as unknown as FilterQuery<T_DBModel> & T_Enforcement, select as any, options);
  }

  // ---------------------------------------------------------------------------
  // find overloads
  // ---------------------------------------------------------------------------

  async find<K extends keyof T_MappedEntity & string>(
    query: FilterQuery<T_DBModel> & T_Enforcement,
    select: readonly K[],
    options?: FindOptionsV2<T_MappedEntity>
  ): Promise<Pick<T_MappedEntity, K>[]>;

  async find<S extends SelectFieldsObject<T_MappedEntity> & { _id: 0 }>(
    query: FilterQuery<T_DBModel> & T_Enforcement,
    select: S,
    options?: FindOptionsV2<T_MappedEntity>
  ): Promise<Pick<T_MappedEntity, Exclude<IncludedKeys<S, T_MappedEntity>, '_id'>>[]>;

  async find<S extends SelectFieldsObject<T_MappedEntity>>(
    query: FilterQuery<T_DBModel> & T_Enforcement,
    select: S,
    options?: FindOptionsV2<T_MappedEntity>
  ): Promise<
    Pick<T_MappedEntity, IncludedKeys<S, T_MappedEntity> | ('_id' extends keyof T_MappedEntity ? '_id' : never)>[]
  >;

  async find(
    query: FilterQuery<T_DBModel> & T_Enforcement,
    select: '*',
    options?: FindOptionsV2<T_MappedEntity>
  ): Promise<T_MappedEntity[]>;

  async find(
    query: FilterQuery<T_DBModel> & T_Enforcement,
    select: SelectInput<T_MappedEntity> | '*',
    options: FindOptionsV2<T_MappedEntity> = {}
  ): Promise<any> {
    const { session, limit, skip, sort, readPreference } = options;
    const projection = convertSelectToProjection(select);

    const builder = this.MongooseModel.find(query, projection, { sort: sort ?? null })
      .skip(skip as number)
      .limit(limit as number)
      .read(readPreference ?? this.defaultReadPreference)
      .lean();

    if (session) builder.session(session);

    const data = await builder.exec();

    return this.mapProjectedEntities(data);
  }

  // ---------------------------------------------------------------------------
  // findBatch (generator) overloads
  // ---------------------------------------------------------------------------

  findBatch<K extends keyof T_MappedEntity & string>(
    query: FilterQuery<T_DBModel> & T_Enforcement,
    select: readonly K[],
    options?: { limit?: number; sort?: Partial<Record<K, 1 | -1>>; skip?: number },
    batchSize?: number
  ): AsyncGenerator<Pick<T_MappedEntity, K>>;

  findBatch<S extends SelectFieldsObject<T_MappedEntity>>(
    query: FilterQuery<T_DBModel> & T_Enforcement,
    select: S,
    options?: FindOptionsV2<T_MappedEntity>,
    batchSize?: number
  ): AsyncGenerator<
    Pick<T_MappedEntity, IncludedKeys<S, T_MappedEntity> | ('_id' extends keyof T_MappedEntity ? '_id' : never)>
  >;

  findBatch(
    query: FilterQuery<T_DBModel> & T_Enforcement,
    select: '*',
    options?: FindOptionsV2<T_MappedEntity>,
    batchSize?: number
  ): AsyncGenerator<T_MappedEntity>;

  async *findBatch(
    query: FilterQuery<T_DBModel> & T_Enforcement,
    select: SelectInput<T_MappedEntity> | '*',
    options: FindOptionsV2<T_MappedEntity> = {},
    batchSize = 500
  ): AsyncGenerator<any> {
    const projection = convertSelectToProjection(select);

    for await (const doc of this._model
      .find(query, projection, {
        sort: options.sort ?? null,
        ...(options.limit != null && { limit: options.limit }),
        ...(options.skip != null && { skip: options.skip }),
        ...(options.session && { session: options.session }),
        ...(options.readPreference && { readPreference: options.readPreference }),
      })
      .lean()
      .batchSize(batchSize)
      .cursor()) {
      yield this.mapProjectedEntity(doc);
    }
  }

  // ---------------------------------------------------------------------------
  // findOneAndUpdate / findOneAndDelete
  // ---------------------------------------------------------------------------

  async findOneAndUpdate(
    query: FilterQuery<T_DBModel> & T_Enforcement,
    update: UpdateQuery<T_DBModel>,
    options: QueryOptions<T_DBModel> & { session?: ClientSession | null } = {}
  ): Promise<T_MappedEntity | null> {
    const { session, ...updateOptions } = options;

    const data = await this.MongooseModel.findOneAndUpdate(query, update, {
      ...updateOptions,
      upsert: updateOptions.upsert || false,
      new: updateOptions.new || false,
      ...(session && { session }),
    }).lean();

    if (!data) return null;

    return this.mapProjectedEntity(data) as T_MappedEntity;
  }

  async findOneAndDelete(
    query: FilterQuery<T_DBModel> & T_Enforcement,
    options: { session?: ClientSession | null } = {}
  ): Promise<T_MappedEntity | null> {
    const { session } = options;
    const builder = this.MongooseModel.findOneAndDelete(query);
    if (session) builder.session(session);

    const data = await builder.lean();
    if (!data) return null;

    return this.mapProjectedEntity(data) as T_MappedEntity;
  }

  // ---------------------------------------------------------------------------
  // Write methods
  // ---------------------------------------------------------------------------

  async delete(
    query: FilterQuery<T_DBModel> & T_Enforcement,
    options: { session?: ClientSession | null } = {}
  ): Promise<{ acknowledged: boolean; deletedCount: number }> {
    const { session } = options;

    if (session) {
      return this.MongooseModel.deleteMany(query, { session });
    }

    return this.MongooseModel.deleteMany(query);
  }

  async create(
    data: FilterQuery<T_DBModel> & T_Enforcement,
    options: IWriteOptions & { session?: ClientSession | null } = {}
  ): Promise<T_MappedEntity> {
    const { session, ...saveOptions } = options;
    const newEntity = new this.MongooseModel(data);

    const mongooseOptions = saveOptions?.writeConcern ? { w: saveOptions.writeConcern } : {};
    if (session) Object.assign(mongooseOptions, { session });

    const saved = await newEntity.save(mongooseOptions);

    return this.mapProjectedEntity(saved.toObject()) as T_MappedEntity;
  }

  async insertMany(
    data: (FilterQuery<T_DBModel> & T_Enforcement)[],
    ordered = false
  ): Promise<{ acknowledged: boolean; insertedCount: number; insertedIds: Types.ObjectId[] }> {
    let result;
    try {
      result = await this.MongooseModel.insertMany(data, { ordered });
    } catch (e: unknown) {
      if (e instanceof Error) throw new DalException(e.message);
      throw new DalException('An unknown error occurred');
    }

    return {
      acknowledged: true,
      insertedCount: result.length,
      insertedIds: result.map((inserted) => inserted._id as Types.ObjectId),
    };
  }

  async update(
    query: FilterQuery<T_DBModel> & T_Enforcement,
    updateBody: UpdateQuery<T_DBModel>,
    options: Omit<mongo.UpdateOptions, 'session'> & {
      timestamps?: boolean;
      strict?: boolean | 'throw';
      session?: ClientSession | null;
    } = {}
  ): Promise<{ matched: number; modified: number }> {
    const { session, ...restOptions } = options;
    const saved = await this.MongooseModel.updateMany(query, updateBody, {
      ...restOptions,
      ...(session && { session }),
    });

    return { matched: saved.matchedCount, modified: saved.modifiedCount };
  }

  async updateOne(
    query: FilterQuery<T_DBModel> & T_Enforcement,
    updateBody: UpdateQuery<T_DBModel>
  ): Promise<{ matched: number; modified: number }> {
    const saved = await this.MongooseModel.updateOne(query, updateBody);

    return { matched: saved.matchedCount, modified: saved.modifiedCount };
  }

  async upsertMany(data: (FilterQuery<T_DBModel> & T_Enforcement)[]) {
    const operations = data.map((entry) => ({
      updateOne: {
        filter: entry,
        update: { $set: entry },
        upsert: true,
      },
    }));

    return this.bulkWrite(operations as mongo.AnyBulkWriteOperation[], false);
  }

  async upsert(query: FilterQuery<T_DBModel> & T_Enforcement, data: FilterQuery<T_DBModel> & T_Enforcement) {
    return this.MongooseModel.findOneAndUpdate(query, data, {
      upsert: true,
      new: true,
      includeResultMetadata: true,
    });
  }

  async bulkWrite(bulkOperations: mongo.AnyBulkWriteOperation[], ordered = false): Promise<any> {
    return this.MongooseModel.bulkWrite(bulkOperations as any, { ordered });
  }

  // ---------------------------------------------------------------------------
  // Transactions
  // ---------------------------------------------------------------------------

  /*
   * Note about parallelism in transactions:
   * Running operations in parallel inside a transaction is undefined behaviour.
   * Avoid Promise.all / Promise.allSettled / Promise.race inside transactions.
   * See https://mongoosejs.com/docs/transactions.html#note-about-parallelism-in-transactions
   */
  async withTransaction(fn: (session: ClientSession | null) => Promise<any>) {
    const session = await this._model.db.startSession();

    try {
      return await session.withTransaction(async (txnSession) => {
        return fn(txnSession);
      });
    } catch (error) {
      const errorMessage = (error as Error)?.message || '';
      if (errorMessage.includes('Transaction numbers are only allowed on')) {
        return fn(null);
      }

      throw error;
    } finally {
      await session.endSession();
    }
  }

  // ---------------------------------------------------------------------------
  // Cursor-based pagination
  // ---------------------------------------------------------------------------

  // Overload 1: array select — data is Pick<T, K> (only the requested fields)
  async findWithCursorBasedPagination<K extends keyof T_MappedEntity & string>(
    options: FindWithCursorPaginationOptionsV2<T_DBModel, readonly K[]> & {
      query?: FilterQuery<T_DBModel> & T_Enforcement;
    }
  ): Promise<{
    data: Pick<T_MappedEntity, K>[];
    next: string | null;
    previous: string | null;
    totalCount: number;
    totalCountCapped: boolean;
  }>;

  // Overload 2: object select with _id: 0
  async findWithCursorBasedPagination<S extends SelectFieldsObject<T_MappedEntity> & { _id: 0 }>(
    options: FindWithCursorPaginationOptionsV2<T_DBModel, S> & {
      query?: FilterQuery<T_DBModel> & T_Enforcement;
    }
  ): Promise<{
    data: Pick<T_MappedEntity, Exclude<IncludedKeys<S, T_MappedEntity>, '_id'>>[];
    next: string | null;
    previous: string | null;
    totalCount: number;
    totalCountCapped: boolean;
  }>;

  // Overload 3: object select without _id: 0 — _id implicitly included
  async findWithCursorBasedPagination<S extends SelectFieldsObject<T_MappedEntity>>(
    options: FindWithCursorPaginationOptionsV2<T_DBModel, S> & {
      query?: FilterQuery<T_DBModel> & T_Enforcement;
    }
  ): Promise<{
    data: Pick<
      T_MappedEntity,
      IncludedKeys<S, T_MappedEntity> | ('_id' extends keyof T_MappedEntity ? '_id' : never)
    >[];
    next: string | null;
    previous: string | null;
    totalCount: number;
    totalCountCapped: boolean;
  }>;

  // Overload 4: "*" — all fields, fully typed
  async findWithCursorBasedPagination(
    options: FindWithCursorPaginationOptionsV2<T_DBModel, '*'> & {
      query?: FilterQuery<T_DBModel> & T_Enforcement;
    }
  ): Promise<{
    data: T_MappedEntity[];
    next: string | null;
    previous: string | null;
    totalCount: number;
    totalCountCapped: boolean;
  }>;

  async findWithCursorBasedPagination({
    query = {} as FilterQuery<T_DBModel> & T_Enforcement,
    limit,
    before,
    after,
    sortBy,
    sortDirection = DirectionEnum.DESC,
    paginateField,
    enhanceQuery,
    includeCursor,
    select,
  }: FindWithCursorPaginationOptionsV2<T_DBModel, SelectInput<T_MappedEntity> | '*' | undefined> & {
    query?: FilterQuery<T_DBModel> & T_Enforcement;
  }): Promise<any> {
    if (before && after) {
      throw new DalException('Cannot specify both "before" and "after" cursors at the same time.');
    }

    const isDesc = sortDirection === DirectionEnum.DESC;
    const sortValue = isDesc ? -1 : 1;
    const paginationQuery: any = { ...query };

    let reverseResults = false;

    if (before) {
      paginationQuery.$or = [
        {
          [sortBy]: isDesc
            ? { [includeCursor ? '$gte' : '$gt']: before.sortBy }
            : { [includeCursor ? '$lte' : '$lt']: before.sortBy },
        },
        {
          $and: [
            { [sortBy]: { $eq: before.sortBy } },
            {
              [paginateField]: isDesc
                ? { [includeCursor ? '$gte' : '$gt']: before.paginateField }
                : { [includeCursor ? '$lte' : '$lt']: before.paginateField },
            },
          ],
        },
      ];
      reverseResults = true;
    } else if (after) {
      paginationQuery.$or = [
        {
          [sortBy]: isDesc
            ? { [includeCursor ? '$lte' : '$lt']: after.sortBy }
            : { [includeCursor ? '$gte' : '$gt']: after.sortBy },
        },
        {
          $and: [
            { [sortBy]: { $eq: after.sortBy } },
            {
              [paginateField]: isDesc
                ? { [includeCursor ? '$lte' : '$lt']: after.paginateField }
                : { [includeCursor ? '$gte' : '$gt']: after.paginateField },
            },
          ],
        },
      ];
    }

    // When a select is provided, silently inject the pagination fields so cursor
    // computation always has access to them — the caller is unaware of this.
    // When select is '*', skip projection entirely (all fields are returned).
    let projection: Record<string, 0 | 1> | undefined;
    if (select !== undefined && select !== '*') {
      projection = convertSelectToProjection(select);
      if (projection) {
        projection[sortBy] = 1;
        projection[paginateField] = 1;
        // _id: 0 is intentionally preserved if the caller set it
      }
    }

    let builder = this.MongooseModel.find(paginationQuery, projection)
      .sort({
        [sortBy]: reverseResults ? -sortValue : sortValue,
        [paginateField]: reverseResults ? -sortValue : sortValue,
      } as Record<string, SortOrder>)
      .limit(limit + 1)
      .lean();

    if (enhanceQuery) builder = enhanceQuery(builder as any);

    const [rawResults, countResult] = await Promise.all([builder.exec(), this.getCountWithLimit(query, 50001)]);

    const hasExtraItem = rawResults.length > limit;
    const totalCount = countResult.count;
    const hasMore = countResult.hasMore;

    let startIndex = 0;
    let endIndex = limit;

    if (reverseResults) {
      rawResults.reverse();
      if (hasExtraItem) {
        startIndex = 1;
        endIndex = limit + 1;
      }
    }

    const pageResults = rawResults.slice(startIndex, endIndex);

    if (pageResults.length === 0) {
      return { data: [], next: null, previous: null, totalCount, totalCountCapped: hasMore };
    }

    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    const firstItem = pageResults[0];
    const lastItem = pageResults[pageResults.length - 1];

    if (hasExtraItem) {
      if (before) {
        prevCursor = firstItem[paginateField].toString();
      } else {
        nextCursor = lastItem[paginateField].toString();
      }
    }

    if (before) {
      const nextQuery: any = { ...query };
      nextQuery.$or = [
        { [sortBy]: isDesc ? { $lt: lastItem[sortBy] } : { $gt: lastItem[sortBy] } },
        {
          $and: [
            { [sortBy]: { $eq: lastItem[sortBy] } },
            { [paginateField]: isDesc ? { $lt: lastItem[paginateField] } : { $gt: lastItem[paginateField] } },
          ],
        },
      ];

      const maybeNext = await this.MongooseModel.findOne(nextQuery)
        .sort({ [sortBy]: sortValue, [paginateField]: sortValue })
        .limit(1)
        .exec();

      if (maybeNext) nextCursor = lastItem[paginateField].toString();
    } else {
      const prevQuery: any = { ...query };
      prevQuery.$or = [
        { [sortBy]: isDesc ? { $gt: firstItem[sortBy] } : { $lt: firstItem[sortBy] } },
        {
          $and: [
            { [sortBy]: { $eq: firstItem[sortBy] } },
            { [paginateField]: isDesc ? { $gt: firstItem[paginateField] } : { $lt: firstItem[paginateField] } },
          ],
        },
      ];

      const maybePrev = await this.MongooseModel.findOne(prevQuery)
        .sort({ [sortBy]: sortValue, [paginateField]: sortValue })
        .limit(1)
        .exec();

      if (maybePrev) prevCursor = firstItem[paginateField].toString();
    }

    return {
      data: this.mapProjectedEntities(pageResults) as T_MappedEntity[],
      next: nextCursor,
      previous: prevCursor,
      totalCount,
      totalCountCapped: hasMore,
    };
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private async getCountWithLimit(
    query: FilterQuery<T_DBModel> & T_Enforcement,
    maxLimit = 50001
  ): Promise<{ count: number; hasMore: boolean }> {
    const result = await this.count(query, maxLimit, 'secondaryPreferred');
    const hasMore = result === maxLimit;

    return { count: hasMore ? maxLimit - 1 : result, hasMore };
  }

  protected regExpEscape(literalString: string): string {
    return literalString.replace(/[-[\]{}()*+!<=:?./\\^$|#\s,]/g, '\\$&');
  }

  /**
   * Maps a raw MongoDB lean document to the entity class.
   * Uses a targeted ObjectId traversal instead of JSON.parse(JSON.stringify())
   * to convert ObjectId → string while avoiding a full serialization cycle.
   */
  protected mapProjectedEntity<TData>(data: TData): Partial<T_MappedEntity> {
    if (!data) return null as any;
    const plain = convertObjectIds(data);

    return plainToInstance(this.entity, plain) as any;
  }

  protected mapProjectedEntities(data: any[]): Partial<T_MappedEntity>[] {
    return data.map((doc) => this.mapProjectedEntity(doc));
  }
}
