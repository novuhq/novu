import { useContext } from 'react';
import { createContextHook } from '@/utils/context';
import { PageHeaderContext, PersistentLayoutContext } from './page-header-context';

export const usePageHeader = createContextHook(PageHeaderContext);

export function useIsPersistentLayout() {
  return useContext(PersistentLayoutContext);
}
