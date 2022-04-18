import { useQuery } from 'react-query';
import { IUserEntity } from '@novu/shared';
import { getUser } from '../user';

export function useUser() {
  const { data: user, refetch: refetchUser } = useQuery<IUserEntity>('currentUser', getUser);

  return {
    user,
    refetchUser,
  };
}
