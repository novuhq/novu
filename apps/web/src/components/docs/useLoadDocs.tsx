import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MDX_URL } from './docs.const';
import { useTelemetry } from '../../hooks/useNovuAPI';

export type DocsQueryResults = {
  code: string;
  title: string;
  description: string;
};

type UseLoadDocsProps = {
  path: string;
  /** Controls whether or not we should execute the query */
  isEnabled: boolean;
};

export const useLoadDocs = ({ path, isEnabled }: UseLoadDocsProps) => {
  const track = useTelemetry();

  const { data = { code: '', title: '', description: '' }, ...queryResults } = useQuery<DocsQueryResults>(
    ['docs', path],
    async () => {
      const response = await fetch(MDX_URL + path);
      const json = await response.json();

      return json;
    },
    { enabled: isEnabled }
  );

  useEffect(() => {
    track('Inline docs opened', {
      documentationPage: path,
      pageURL: window.location.href,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return {
    ...queryResults,
    data,
    // TODO: we should really be handling this through proper errors in the query, but this will suffice for now
    hasLoadedSuccessfully: Boolean(!queryResults.isLoading && data.title),
  };
};
