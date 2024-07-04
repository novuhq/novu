import { Docs } from './Docs';
import { useLoadDocs } from './useLoadDocs';

export const ChildDocs = ({ path }: { path: string }) => {
  const { isLoading, data } = useLoadDocs({ path, isEnabled: true });

  return <Docs isLoading={isLoading} isChildDocs={true} {...data}></Docs>;
};
