import { UserEntity } from '../user';
import { ChangeEntity } from './change.entity';

export type ChangeEntityPopulated = ChangeEntity & {
  user: Pick<UserEntity, '_id' | 'firstName' | 'lastName' | 'profilePicture'>;
};
