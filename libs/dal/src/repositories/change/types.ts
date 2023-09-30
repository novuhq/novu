import { ChangeEntity } from './change.entity';
import { UserEntity } from '../user';

export type ChangeEntityPopulated = ChangeEntity & {
  user: Pick<UserEntity, '_id' | 'firstName' | 'lastName' | 'profilePicture'>;
};
