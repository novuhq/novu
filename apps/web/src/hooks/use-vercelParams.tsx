import { useSearchParams } from 'react-router-dom';

export function useVercelParams() {
  const [params] = useSearchParams();
  const code = params.get('code');
  const next = params.get('next');
  const isFromVercel = !!(code && next);

  return {
    code,
    next,
    isFromVercel,
  };
}
