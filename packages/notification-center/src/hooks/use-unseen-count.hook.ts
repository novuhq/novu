import { useContext } from 'react';
import { UnseenCountContext } from '../store/unseen-count.context';

export function useUnseenCount() {
  const { unseenCount, setUnseenCount } = useContext(UnseenCountContext);

  return { unseenCount, setUnseenCount };
}
