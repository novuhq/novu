import { TransformEntityToDbModel } from '.';
import { IEntity } from './base.entity';

export type IDBModel = TransformEntityToDbModel<IEntity>;
