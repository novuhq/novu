import { Types } from 'mongoose';

export type ChangePropsValueType<T, K extends keyof T, V = Types.ObjectId> = Omit<T, K> & {
  [P in K]: V;
};
