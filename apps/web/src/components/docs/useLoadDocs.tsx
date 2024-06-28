import { useSegment } from '../providers/SegmentProvider';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MDX_URL } from './docs.const';

export type DocsQueryResults = {
  code: string;
  title: string;
  description: string;
};

type UseLoadDocsProps = {
  path: string;
};

export const useLoadDocs = ({ path }: UseLoadDocsProps) => {
  const segment = useSegment();

  const queryResults = useQuery<DocsQueryResults>(['docs', path], async () => {
    const response = await fetch(MDX_URL + path);
    const json = await response.json();

    return json;
  });

  useEffect(() => {
    segment.track('Inline docs opened', {
      documentationPage: path,
      pageURL: window.location.href,
    });
  }, [path, segment]);

  return {
    ...queryResults,
    data: queryResults.data ?? { code: '', title: '', description: '' },
  };
};
