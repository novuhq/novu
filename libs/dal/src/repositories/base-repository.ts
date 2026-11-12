import { DirectionEnum } from '@novu/shared';
import { ClassConstructor } from 'class-transformer';
import {
  AnyBulkWriteOperation,
  ClientSession,
  FilterQuery,
  Model,
  mongo,
  PipelineStage,
  ProjectionType,
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
import { toEntity } from './to-entity';

/** Query helpers type of the repository models (none are registered); the `{}` mongoose defaults to. */
type NoQueryHelpers = Record<never, never>;

/** Mongoose's own type for the `sort` query option. */
type SortOption<TModel> = QueryOptions<TModel>['sort'];

/**
 * @deprecated Use BaseRepositoryV2 instead. BaseRepositoryV2 enforces required
 * field selection via a mandatory `select` parameter and provides auto-inferred
 * return types based on the selected fields (Pick<Entity, Keys>).
 * All existing repositories remain on this class; only new repositories should
 * extend BaseRepositoryV2.
 */
export class BaseRepository<T_DBModel, T_MappedEntity, T_Enforcement> {
  public _model: Model<T_DBModel>;

  constructor(
    protected MongooseModel: Model<T_DBModel>,
    protected entity: ClassConstructor<T_MappedEntity>
  ) {
    this._model = MongooseModel;
  }

  public static createObjectId() {
    return new Types.ObjectId().toString();
  }

  public static isInternalId(id: string) {
    const isValidMongoId = Types.ObjectId.isValid(id);
    if (!isValidMongoId) {
      return false;
    }

    return id === new Types.ObjectId(id).toString();
  }

  protected convertObjectIdToString(value: Types.ObjectId): string {
    return value.toString();
  }

  protected convertStringToObjectId(value: string): Types.ObjectId {
    return new Types.ObjectId(value);
  }

  /**
   * Builds a MongoDB query for exact context key matching in READ operations.
   * Uses $all and $size operators for order-independent array matching.
   */
  public buildContextExactMatchQuery(
    contextKeys?: string[],
    options?: {
      enabled?: boolean;
      strictEmpty?: boolean;
    }
  ): Record<string, unknown> {
    const { enabled = true, strictEmpty = false } = options ?? {};

    if (!enabled) {
      return {};
    }

    // Match records with no context (default/empty context)
    if (contextKeys === undefined || contextKeys.length === 0) {
      // For collections created after context was introduced, we always write contextKeys: []
      // For older collections, the field may not exist (treated as default context)
      if (strictEmpty) {
        return { contextKeys: [] };
      }

      // Match both missing field (legacy) and empty array (current)
      return {
        $or: [{ contextKeys: { $exists: false } }, { contextKeys: [] }],
      };
    }

    // Sort defensively to ensure consistent matching regardless of input order
    // This protects against unsorted input and enables future query optimization
    const sortedKeys = [...contextKeys].sort();

    // Use $all + $size for order-independent array matching
    // After data migration to guarantee sorted storage, this can be simplified to:
    // return { contextKeys: sortedKeys };  // Direct equality (faster, uses index)
    return {
      contextKeys: { $all: sortedKeys, $size: sortedKeys.length },
    };
  }

  async count(
    query: FilterQuery<T_DBModel> & T_Enforcement,
    limit?: number,
    readPreference?: 'secondaryPreferred' | 'primary'
  ): Promise<number> {
    return this.MongooseModel.countDocuments(query, {
      limit,
      readPreference: readPreference || 'primary',
    });
  }

  private async getCountWithLimit(
    query: FilterQuery<T_DBModel> & T_Enforcement,
    maxLimit: number = 50001
  ): Promise<{ count: number; hasMore: boolean }> {
    const result = await this.count(query, maxLimit, 'secondaryPreferred');
    const count = result;
    const hasMore = count === maxLimit;

    return {
      count: hasMore ? maxLimit - 1 : count,
      hasMore,
    };
  }

  async estimatedDocumentCount(): Promise<number> {
    return this.MongooseModel.estimatedDocumentCount();
  }

  async aggregate(
    query: PipelineStage[],
    options: { readPreference?: 'secondaryPreferred' | 'primary' } = {}
    // biome-ignore lint/suspicious/noExplicitAny: rows are pipeline-shaped; callers annotate their own row types (e.g. TopicRepository.filterTopics)
  ): Promise<any> {
    return await this.MongooseModel.aggregate(query).read(options.readPreference || 'primary');
  }

  async findOne(
    query: FilterQuery<T_DBModel> & T_Enforcement,
    select?: ProjectionType<T_MappedEntity>,
    options: {
      readPreference?: 'secondaryPreferred' | 'primary';
      query?: QueryOptions<T_DBModel>;
      session?: ClientSession | null;
      enhanceQuery?: <
        TQuery extends QueryWithHelpers<T_DBModel | null, T_DBModel, NoQueryHelpers, T_DBModel, 'findOne'>,
      >(
        queryBuilder: TQuery
      ) => QueryWithHelpers<T_DBModel | null, T_DBModel, NoQueryHelpers, T_DBModel, 'findOne'>;
    } = {}
  ): Promise<T_MappedEntity | null> {
    const { session, ...queryOptions } = options;

    let queryBuilder = this.MongooseModel.findOne(query, select, queryOptions.query).read(
      queryOptions.readPreference || 'primary'
    );

    if (session) {
      queryBuilder.session(session);
    }

    if (options.enhanceQuery) {
      queryBuilder = options.enhanceQuery(queryBuilder) as typeof queryBuilder;
    }

    const data = await queryBuilder;
    if (!data) return null;

    return this.mapEntity(data.toObject());
  }

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
    });

    if (!data) return null;

    return this.mapEntity(data.toObject());
  }

  async delete(
    query: FilterQuery<T_DBModel> & T_Enforcement,
    options: { session?: ClientSession | null } = {}
  ): Promise<{
    /** Indicates whether this writes result was acknowledged. If not, then all other members of this result will be undefined. */
    acknowledged: boolean;
    /** The number of documents that were deleted */
    deletedCount: number;
  }> {
    const { session } = options;
    const deleteOptions = session ? { session } : {};

    return await this.MongooseModel.deleteMany(query, deleteOptions);
  }

  async findOneAndDelete(query: FilterQuery<T_DBModel> & T_Enforcement): Promise<T_MappedEntity | null> {
    const data = await this.MongooseModel.findOneAndDelete(query).lean();
    if (!data) return null;

    return this.mapEntity(data);
  }

  async find(
    query: FilterQuery<T_DBModel> & T_Enforcement,
    select: ProjectionType<T_MappedEntity> = '',
    options: {
      limit?: number;
      sort?: SortOption<T_DBModel>;
      skip?: number;
      session?: ClientSession | null;
      readPreference?: 'secondaryPreferred' | 'primary';
    } = {}
  ): Promise<T_MappedEntity[]> {
    const { session, ...queryOptions } = options;

    const queryBuilder = this.MongooseModel.find(query, select, {
      sort: queryOptions.sort || null,
    })
      .skip(queryOptions.skip as number)
      .limit(queryOptions.limit as number)
      .read(queryOptions.readPreference || 'primary')
      .lean();

    if (session) {
      queryBuilder.session(session);
    }

    const data = await queryBuilder.exec();

    return this.mapEntities(data);
  }

  async *findBatch(
    query: FilterQuery<T_DBModel> & T_Enforcement,
    select = '',
    options: { limit?: number; sort?: SortOption<T_DBModel>; skip?: number } = {},
    batchSize = 500
  ) {
    for await (const doc of this._model
      .find(query, select, {
        sort: options.sort || null,
      })
      .batchSize(batchSize)
      .cursor()) {
      yield this.mapEntity(doc);
    }
  }

  private async createCursorBasedOrStatement({
    isSortDesc,
    paginateField,
    after,
    queryOrStatements,
  }: {
    isSortDesc: boolean;
    paginateField?: string;
    after: string;
    queryOrStatements?: object[];
  }): Promise<FilterQuery<T_DBModel>[]> {
    const afterItem = await this.MongooseModel.findOne({ _id: after });
    if (!afterItem) {
      throw new DalException('Invalid after id');
    }

    let cursorOrStatements: FilterQuery<T_DBModel>[] = [];
    let enhancedCursorOrStatements: FilterQuery<T_DBModel>[] = [];
    if (paginateField && afterItem[paginateField]) {
      const paginatedFieldValue = afterItem[paginateField];
      cursorOrStatements = [
        {
          [paginateField]: isSortDesc ? { $lt: paginatedFieldValue } : { $gt: paginatedFieldValue },
        } as FilterQuery<T_DBModel>,
        { [paginateField]: { $eq: paginatedFieldValue }, _id: isSortDesc ? { $lt: after } : { $gt: after } },
      ];
      const firstStatement = (queryOrStatements ?? []).map((item) => ({
        ...item,
        ...cursorOrStatements[0],
      }));
      const secondStatement = (queryOrStatements ?? []).map((item) => ({
        ...item,
        ...cursorOrStatements[1],
      }));
      enhancedCursorOrStatements = [...firstStatement, ...secondStatement];
    } else {
      cursorOrStatements = [{ _id: isSortDesc ? { $lt: after } : { $gt: after } }];
      const firstStatement = (queryOrStatements ?? []).map((item) => ({
        ...item,
        ...cursorOrStatements[0],
      }));
      enhancedCursorOrStatements = [...firstStatement];
    }

    return enhancedCursorOrStatements.length > 0 ? enhancedCursorOrStatements : cursorOrStatements;
  }

  /**
   * @deprecated This method is deprecated
   * Please use findWithCursorBasedPagination() instead.
   */
  async cursorPagination({
    query,
    limit,
    offset,
    after,
    sort,
    paginateField,
    enhanceQuery,
  }: {
    query?: FilterQuery<T_DBModel> & T_Enforcement;
    limit: number;
    offset: number;
    after?: string;
    sort?: SortOption<T_DBModel>;
    paginateField?: string;
    /** May change the query's result type (e.g. `populate`); the rows are mapped as entities either way. */
    enhanceQuery?: (query: QueryWithHelpers<Array<T_DBModel>, T_DBModel>) => unknown;
  }): Promise<{ data: T_MappedEntity[]; hasMore: boolean }> {
    const isAfterDefined = typeof after !== 'undefined';
    const sortKeys = Object.keys(sort ?? {});
    const isSortDesc = sortKeys.length > 0 && sort[sortKeys[0]] === -1;

    let findQueryBuilder = this.MongooseModel.find({
      ...query,
    });
    if (isAfterDefined) {
      const orStatements = await this.createCursorBasedOrStatement({
        isSortDesc,
        paginateField,
        after,
        queryOrStatements: query?.$or,
      });

      findQueryBuilder = this.MongooseModel.find({
        ...query,
        $or: orStatements,
      });
    }

    findQueryBuilder.sort(sort).limit(limit + 1);
    if (!isAfterDefined) {
      findQueryBuilder.skip(offset);
    }

    if (enhanceQuery) {
      findQueryBuilder = enhanceQuery(findQueryBuilder) as typeof findQueryBuilder;
    }

    const messages = await findQueryBuilder.exec();

    const hasMore = messages.length > limit;
    if (hasMore) {
      messages.pop();
    }

    return {
      data: this.mapEntities(messages),
      hasMore,
    };
  }

  async create(
    data: FilterQuery<T_DBModel> & T_Enforcement,
    options: IOptions & { session?: ClientSession | null } = {}
  ): Promise<T_MappedEntity> {
    const { session, ...saveOptions } = options;
    const newEntity = new this.MongooseModel(data);

    const mongooseOptions = saveOptions?.writeConcern ? { w: saveOptions?.writeConcern } : {};
    if (session) {
      Object.assign(mongooseOptions, { session });
    }

    const saved = await newEntity.save(mongooseOptions);

    return this.mapEntity(saved);
  }

  async insertMany(
    data: FilterQuery<T_DBModel> & T_Enforcement[],
    ordered = false
  ): Promise<{ acknowledged: boolean; insertedCount: number; insertedIds: Types.ObjectId[] }> {
    let result;
    try {
      result = await this.MongooseModel.insertMany(data, { ordered });
    } catch (e: unknown) {
      if (e instanceof Error) {
        throw new DalException(e.message);
      } else {
        throw new DalException('An unknown error occurred');
      }
    }

    const insertedIds = result.map((inserted) => inserted._id);

    return {
      acknowledged: true,
      insertedCount: result.length,
      insertedIds,
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
  ): Promise<{
    matched: number;
    modified: number;
  }> {
    const { session, ...restOptions } = options;
    const saved = await this.MongooseModel.updateMany(query, updateBody, {
      ...restOptions,
      ...(session && { session }),
    });

    return {
      matched: saved.matchedCount,
      modified: saved.modifiedCount,
    };
  }

  async updateOne(
    query: FilterQuery<T_DBModel> & T_Enforcement,
    updateBody: UpdateQuery<T_DBModel>
  ): Promise<{
    matched: number;
    modified: number;
  }> {
    const saved = await this.MongooseModel.updateOne(query, updateBody);

    return {
      matched: saved.matchedCount,
      modified: saved.modifiedCount,
    };
  }

  async upsertMany(data: (FilterQuery<T_DBModel> & T_Enforcement)[]) {
    const promises = data.map((entry) =>
      this.MongooseModel.findOneAndUpdate(entry, entry, { upsert: true, new: true })
    );

    return await Promise.all(promises);
  }

  async upsert(query: FilterQuery<T_DBModel> & T_Enforcement, data: FilterQuery<T_DBModel> & T_Enforcement) {
    return await this.MongooseModel.findOneAndUpdate(query, data, {
      upsert: true,
      new: true,
      includeResultMetadata: true,
    });
  }

  async bulkWrite(bulkOperations: AnyBulkWriteOperation[], ordered = false) {
    return await this.MongooseModel.bulkWrite(bulkOperations, { ordered });
  }

  /**
   * Same output as `plainToInstance(this.entity, JSON.parse(JSON.stringify(data)))` in one pass; see `to-entity.ts`.
   */
  protected mapEntity<TData>(data: TData): TData extends null ? null : T_MappedEntity {
    return toEntity(this.entity, data) as TData extends null ? null : T_MappedEntity;
  }

  protected mapEntities(data: unknown): T_MappedEntity[] {
    return toEntity(this.entity, data as unknown[]);
  }

  /*
   * Note about parallelism in transactions
   *
   * Running operations in parallel is not supported during a transaction.
   * The use of Promise.all, Promise.allSettled, Promise.race, etc. to parallelize operations
   * inside a transaction is undefined behaviour and should be avoided.
   *
   * Refer to https://mongoosejs.com/docs/transactions.html#note-about-parallelism-in-transactions
   */
  async withTransaction<TResult>(fn: (session: ClientSession | null) => Promise<TResult>): Promise<TResult> {
    const session = await this._model.db.startSession();
    try {
      return await session.withTransaction(fn);
    } catch (error) {
      // Check if the error is related to replica set requirement
      const errorMessage = error?.message?.toLowerCase() || '';
      if (
        errorMessage.includes('replica set') ||
        errorMessage.includes('transaction') ||
        error.codeName === 'IllegalOperation'
      ) {
        // MongoDB is not running in replica set mode, execute without transaction
        return await fn(null);
      }

      throw error;
    } finally {
      await session.endSession().catch(() => {});
    }
  }

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
  }: {
    query?: FilterQuery<T_DBModel> & T_Enforcement;
    limit: number;
    before?: CursorPosition;
    after?: CursorPosition;
    sortBy: string;
    sortDirection: DirectionEnum;
    paginateField: string;
    /** May change the query's result type (e.g. `populate`); the rows are mapped as entities either way. */
    enhanceQuery?: (query: QueryWithHelpers<Array<T_DBModel>, T_DBModel>) => unknown;
    includeCursor?: boolean;
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

    let builder = this.MongooseModel.find(paginationQuery)
      .sort(buildCursorSort(key, pageSortDirection(isDesc, reverseResults)))
      .limit(limit + 1);

    if (enhanceQuery) {
      builder = enhanceQuery(builder) as typeof builder;
    }

    // Run find query and count aggregation in parallel
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
      data: this.mapEntities(pageResults),
      next,
      previous,
      totalCount: countResult.count,
      totalCountCapped: countResult.hasMore,
    };
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

  protected regExpEscape(literalString: string): string {
    return literalString.replace(/[-[\]{}()*+!<=:?./\\^$|#\s,]/g, '\\$&');
  }
}

interface IOptions {
  writeConcern?: number | 'majority';
}
