/* eslint-disable @typescript-eslint/no-explicit-any */
import { ClassConstructor, plainToClass } from 'class-transformer';
import { Document, FilterQuery, Model } from 'mongoose';

export class BaseRepository<T> {
  public _model: Model<any & Document>;

  constructor(protected MongooseModel: Model<any & Document>, protected entity: ClassConstructor<T>) {
    this._model = MongooseModel;
  }

  async count(query: FilterQuery<T & Document>): Promise<number> {
    return await this.MongooseModel.countDocuments(query);
  }

  async aggregate(query: any[]): Promise<any> {
    return await this.MongooseModel.aggregate(query);
  }

  async findById(id: string, select?: keyof T): Promise<T | null> {
    const data = await this.MongooseModel.findById(id, select);
    if (!data) return null;

    return this.mapEntity(data.toObject());
  }

  async findOne(query: FilterQuery<T & Document>, select?: keyof T | string) {
    const data = await this.MongooseModel.findOne(query, select);
    if (!data) return null;

    return this.mapEntity(data.toObject());
  }

  async delete(query: FilterQuery<T & Document>) {
    const data = await this.MongooseModel.remove(query);
    return data;
  }

  async find(
    query: FilterQuery<T & Document>,
    select = '',
    options: { limit?: number; sort?: any; skip?: number } = {}
  ): Promise<T[]> {
    const data = await this.MongooseModel.find(query, select, {
      sort: options.sort || null,
    })
      .skip(options.skip)
      .limit(options.limit)
      .lean()
      .exec();

    return this.mapEntities(data);
  }

  async create(data: Partial<T>): Promise<T> {
    const newEntity = new this.MongooseModel(data);
    const saved = await newEntity.save();

    return this.mapEntity(saved);
  }

  async createMany(data: T[]) {
    await new Promise((resolve) => {
      this.MongooseModel.collection.insertMany(data, (err, response) => {
        resolve(response);
      });
    });
  }

  async update(
    query: FilterQuery<T & Document>,
    updateBody: any
  ): Promise<{
    matched: number;
    modified: number;
  }> {
    const saved = await this.MongooseModel.updateMany(query, updateBody, {
      multi: true,
    });

    return {
      matched: saved.n,
      modified: saved.nModified,
    };
  }

  protected mapEntity(data: any): T {
    return plainToClass<T, T>(this.entity, JSON.parse(JSON.stringify(data))) as any;
  }

  protected mapEntities(data: any): T[] {
    return plainToClass<T, T[]>(this.entity, JSON.parse(JSON.stringify(data)));
  }
}
