import { IndexDirection } from 'mongoose';

export type IndexDefinition<Entity> = Partial<Record<keyof Entity, IndexDirection>>;
