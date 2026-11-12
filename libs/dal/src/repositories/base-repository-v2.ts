import { DirectionEnum } from '@novu/shared';
import { ClassConstructor } from 'class-transformer';
import {
  AnyBulkWriteOperation,
  ClientSession,
  FilterQuery,
  Model,
  mongo,
  PipelineStage,
  QueryOptions,
  QueryWithHelpers,
  Types,
  UpdateQuery,
} from 'mongoose';
import { DalException } from '../shared';
import {
  buildAdjacentPageQuery,
  buildCursorSort,
  buildCursorWalkOr,
  CursorPaginatedResult,
  CursorPosition,
  cursorToken,
  mergeTopLevelOr,
  pageSortDirection,
  slicePage,
} from './cursor-pagination';
import { convertSelectToProjection, IncludedKeys, SelectFieldsObject, SelectInput } from './projection.types';
import { toEntity } from './to-entity';

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
  before?: CursorPosition;
  after?: CursorPosition;
  sortBy: string;
  sortDirection?: DirectionEnum;
  paginateField: string;
  /** May change the query's result type (e.g. `populate`); the rows are mapped as entities either way. */
  enhanceQuery?: (query: QueryWithHelpers<Array<T_DBModel>, T_DBModel>) => unknown;
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
 * - Documents are mapped with a single-pass walk that gives the same output as a JSON round-trip (`to-entity.ts`)
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

  async aggregate(
    query: PipelineStage[],
    options: { readPreference?: 'secondaryPreferred' | 'primary' } = {}
    // biome-ignore lint/suspicious/noExplicitAny: rows are pipeline-shaped; callers annotate their own row types (e.g. TopicRepository.filterTopics)
  ): Promise<any> {
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
  ): Promise<T_MappedEntity | null> {
    return this.findOneProjected(query, select, options);
  }

  /** Shared implementation of the `findOne` / `findById` overloads. */
  private async findOneProjected(
    query: FilterQuery<T_DBModel> & T_Enforcement,
    select: SelectInput<T_MappedEntity> | '*',
    options: FindOneOptionsV2<T_DBModel> = {}
  ): Promise<T_MappedEntity | null> {
    const { session, query: queryOpts, readPreference } = options;
    const projection = convertSelectToProjection(select);

    const builder = this.MongooseModel.findOne(query, projection, queryOpts)
      .read(readPreference ?? this.defaultReadPreference)
      .lean();

    if (session) builder.session(session);

    const data = await builder.exec();
    if (!data) return null;

    // Narrowed to the selected fields by the public overloads
    return this.mapProjectedEntity(data) as T_MappedEntity | null;
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
  ): Promise<T_MappedEntity | null> {
    return this.findOneProjected(query, select, options);
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
  ): Promise<T_MappedEntity[]> {
    const { session, limit, skip, sort, readPreference } = options;
    const projection = convertSelectToProjection(select);

    const builder = this.MongooseModel.find(query, projection, { sort: sort ?? null })
      .skip(skip as number)
      .limit(limit as number)
      .read(readPreference ?? this.defaultReadPreference)
      .lean();

    if (session) builder.session(session);

    const data = await builder.exec();

    // Narrowed to the selected fields by the public overloads
    return this.mapProjectedEntities(data) as T_MappedEntity[];
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
  ): AsyncGenerator<T_MappedEntity> {
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
      // Narrowed to the selected fields by the public overloads
      yield this.mapProjectedEntity(doc) as T_MappedEntity;
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

    return this.bulkWrite(operations, false);
  }

  async upsert(query: FilterQuery<T_DBModel> & T_Enforcement, data: FilterQuery<T_DBModel> & T_Enforcement) {
    return this.MongooseModel.findOneAndUpdate(query, data, {
      upsert: true,
      new: true,
      includeResultMetadata: true,
    });
  }

  async bulkWrite(bulkOperations: AnyBulkWriteOperation[], ordered = false) {
    return this.MongooseModel.bulkWrite(bulkOperations, { ordered });
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
  async withTransaction<TResult>(fn: (session: ClientSession | null) => Promise<TResult>): Promise<TResult> {
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
  }): Promise<CursorPaginatedResult<T_MappedEntity>> {
    if (before && after) {
      throw new DalException('Cannot specify both "before" and "after" cursors at the same time.');
    }

    const key = { sortBy, paginateField };
    const isDesc = sortDirection === DirectionEnum.DESC;
    // Backwards pagination runs the query in reverse sort order
    const reverseResults = Boolean(before);

    const paginationQuery: FilterQuery<T_DBModel> = { ...query };
    const cursorOr = buildCursorWalkOr<T_DBModel>({ key, before, after, isDesc, includeCursor });
    if (cursorOr) {
      mergeTopLevelOr(paginationQuery, cursorOr);
    }

    let builder = this.MongooseModel.find(paginationQuery, this.paginationProjection(select, key))
      .sort(buildCursorSort(key, pageSortDirection(isDesc, reverseResults)))
      .limit(limit + 1)
      .lean();

    if (enhanceQuery) {
      builder = enhanceQuery(builder as QueryWithHelpers<Array<T_DBModel>, T_DBModel>) as typeof builder;
    }

    const [rawResults, countResult] = await Promise.all([builder.exec(), this.getCountWithLimit(query, 50001)]);

    const { pageResults, hasExtraItem } = slicePage(rawResults, limit, reverseResults);

    if (pageResults.length === 0) {
      return {
        data: [],
        next: null,
        previous: null,
        totalCount: countResult.count,
        totalCountCapped: countResult.hasMore,
      };
    }

    const { next, previous } = await this.resolvePageCursors({
      query,
      key,
      pageResults,
      hasExtraItem,
      isBackward: Boolean(before),
      isDesc,
    });

    return {
      data: this.mapProjectedEntities(pageResults) as T_MappedEntity[],
      next,
      previous,
      totalCount: countResult.count,
      totalCountCapped: countResult.hasMore,
    };
  }

  /**
   * When a select is provided, silently inject the pagination fields so cursor
   * computation always has access to them — the caller is unaware of this.
   * When select is '*', skip projection entirely (all fields are returned).
   */
  private paginationProjection(
    select: SelectInput<T_MappedEntity> | '*' | undefined,
    key: { sortBy: string; paginateField: string }
  ): Record<string, 0 | 1> | undefined {
    if (select === undefined || select === '*') return undefined;

    const projection = convertSelectToProjection(select);
    if (projection) {
      projection[key.sortBy] = 1;
      projection[key.paginateField] = 1;
      // _id: 0 is intentionally preserved if the caller set it
    }

    return projection;
  }

  /**
   * The cursor in the paging direction exists when the page query returned an extra
   * row; the opposite one exists when a probe finds a row beyond the page boundary.
   */
  private async resolvePageCursors<TRow>({
    query,
    key,
    pageResults,
    hasExtraItem,
    isBackward,
    isDesc,
  }: {
    query: FilterQuery<T_DBModel> & T_Enforcement;
    key: { sortBy: string; paginateField: string };
    pageResults: TRow[];
    hasExtraItem: boolean;
    isBackward: boolean;
    isDesc: boolean;
  }): Promise<{ next: string | null; previous: string | null }> {
    const firstItem = pageResults[0];
    const lastItem = pageResults[pageResults.length - 1];

    if (isBackward) {
      const previous = hasExtraItem ? cursorToken(firstItem, key.paginateField) : null;
      const hasNextPage = await this.hasAdjacentRow(
        buildAdjacentPageQuery({ query, key, boundaryItem: lastItem, towardsGreater: !isDesc }),
        key,
        isDesc
      );

      return { next: hasNextPage ? cursorToken(lastItem, key.paginateField) : null, previous };
    }

    const next = hasExtraItem ? cursorToken(lastItem, key.paginateField) : null;
    const hasPreviousPage = await this.hasAdjacentRow(
      buildAdjacentPageQuery({ query, key, boundaryItem: firstItem, towardsGreater: isDesc }),
      key,
      isDesc
    );

    return { next, previous: hasPreviousPage ? cursorToken(firstItem, key.paginateField) : null };
  }

  private async hasAdjacentRow(
    adjacentQuery: FilterQuery<T_DBModel>,
    key: { sortBy: string; paginateField: string },
    isDesc: boolean
  ): Promise<boolean> {
    const adjacentRow = await this.MongooseModel.findOne(adjacentQuery)
      .sort(buildCursorSort(key, pageSortDirection(isDesc, false)))
      .limit(1)
      .exec();

    return Boolean(adjacentRow);
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
  protected mapProjectedEntity<TData>(data: TData): Partial<T_MappedEntity> | null {
    if (!data) return null;

    return toEntity(this.entity, data);
  }

  protected mapProjectedEntities<TData>(data: TData[]): (Partial<T_MappedEntity> | null)[] {
    return data.map((doc) => this.mapProjectedEntity(doc));
  }
}
