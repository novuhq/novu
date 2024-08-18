import { Docs } from './Docs';
import { useLoadDocs } from './useLoadDocs';

/**
 * This component is used to load imported docs in main docs path.
 * It will not have a title and description.
 */
export const ChildDocs = ({ path }: { path: string }) => {
  const { isLoading, data } = useLoadDocs({ path, isEnabled: true });

  return <Docs isLoading={isLoading} isChildDocs {...data}></Docs>;
};
