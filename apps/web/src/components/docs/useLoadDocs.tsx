import { useQuery } from '@tanstack/react-query';
import { MDX_URL } from './docs.const';

export type DocsQueryResults = {
  code: string;
  title: string;
  description: string;
  /** is a map of what needs to have globals and are usually mapped to ChildDocs component */
  mappings: Record<string, Record<string, string> | string>;
};

type UseLoadDocsProps = {
  path: string;
  /** Controls whether or not we should execute the query */
  isEnabled: boolean;
};

export const useLoadDocs = ({ path, isEnabled }: UseLoadDocsProps) => {
  const { data = { code: '', title: '', description: '', mappings: {} }, ...queryResults } = useQuery<DocsQueryResults>(
    ['docs', path],
    async () => {
      const response = await fetch(MDX_URL + path);
      const json = await response.json();

      return json;
    },
    { enabled: isEnabled }
  );

  return {
    ...queryResults,
    data,
    // TODO: we should really be handling this through proper errors in the query, but this will suffice for now
    hasLoadedSuccessfully: Boolean(!queryResults.isLoading && data.code),
  };
};
