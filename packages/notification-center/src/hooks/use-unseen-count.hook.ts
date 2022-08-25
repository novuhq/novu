import { useContext } from 'react';
import { UnseenCountContext } from '../store';

export function useUnseenCount() {
  const { unseenCount, setUnseenCount } = useContext(UnseenCountContext);

  return { unseenCount, setUnseenCount };
}
