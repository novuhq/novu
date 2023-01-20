/* eslint-disable @typescript-eslint/no-explicit-any */
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { Document, Model, Query, Types, ProjectionType } from 'mongoose';

export class BaseRepository<T_Query, T_Response> {
  public _model: Model<any & Document>;

  constructor(protected MongooseModel: Model<any & Document>, protected entity: ClassConstructor<T_Response>) {
    this._model = MongooseModel;
  }

  public static createObjectId() {
    return new Types.ObjectId().toString();
  }

  protected convertObjectIdToString(value: Types.ObjectId): string {
    return value.toString();
  }

  protected convertStringToObjectId(value: string): Types.ObjectId {
    return new Types.ObjectId(value);
  }

  async count(query: T_Query): Promise<number> {
    return await this.MongooseModel.countDocuments(query);
  }

  async aggregate(query: any[]): Promise<any> {
    return await this.MongooseModel.aggregate(query);
  }

  async findById(id: string, select?: string): Promise<T_Response | null> {
    const data = await this.MongooseModel.findById(id, select);
    if (!data) return null;

    return this.mapEntity(data.toObject());
  }

  async findOne(query: T_Query, select?: ProjectionType<T_Response>) {
    const data = await this.MongooseModel.findOne(query, select);
    if (!data) return null;

    return this.mapEntity(data.toObject());
  }

  async delete(query: T_Query): Promise<void> {
    return await this.MongooseModel.remove(query);
  }

  async find(
    query: T_Query,
    select: ProjectionType<T_Response> = '',
    options: { limit?: number; sort?: any; skip?: number } = {}
  ): Promise<T_Response[]> {
    const data = await this.MongooseModel.find(query, select, {
      sort: options.sort || null,
    })
      .skip(options.skip as number)
      .limit(options.limit as number)
      .lean()
      .exec();

    return this.mapEntities(data);
  }

  async *findBatch(
    query: T_Query,
    select = '',
    options: { limit?: number; sort?: any; skip?: number } = {},
    batchSize = 500
  ) {
    for await (const doc of this._model
      .find(query, select, {
        sort: options.sort || null,
      })
      .batchSize(batchSize)
      .cursor()) {
      yield this.mapEntities(doc);
    }
  }

  async create(data: T_Query): Promise<T_Response> {
    const newEntity = new this.MongooseModel(data);
    const saved = await newEntity.save();

    return this.mapEntity(saved);
  }

  async update(
    query: T_Query,
    updateBody: any
  ): Promise<{
    matched: number;
    modified: number;
  }> {
    const saved = await this.MongooseModel.updateMany(query, updateBody, {
      multi: true,
    });

    return {
      matched: saved.matchedCount,
      modified: saved.modifiedCount,
    };
  }

  async upsertMany(data: T_Query[]) {
    const promises = data.map((entry) => this.MongooseModel.findOneAndUpdate(entry, entry, { upsert: true }));

    return await Promise.all(promises);
  }

  async bulkWrite(bulkOperations: any) {
    await this.MongooseModel.bulkWrite(bulkOperations);
  }

  protected mapEntity(data: any): T_Response {
    return plainToInstance<T_Response, T_Response>(this.entity, JSON.parse(JSON.stringify(data))) as any;
  }

  protected mapEntities(data: any): T_Response[] {
    return plainToInstance<T_Response, T_Response[]>(this.entity, JSON.parse(JSON.stringify(data)));
  }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Omit = <T, K extends keyof T>(Class: new () => T, keys: K[]): new () => Omit<T, typeof keys[number]> =>
  Class;
