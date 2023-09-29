import { useContext } from 'react';

import { StoreContext } from '../store/store.context';

export const useStore = () => {
  return useContext(StoreContext);
};
