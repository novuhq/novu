import { useSearchParams } from 'react-router-dom';

export function useVercelParams() {
  const [params] = useSearchParams();

  const code = params.get('code');
  const next = params.get('next');
  const configurationId = params.get('configuration_id') || params.get('configurationId');

  const isFromVercel = !!(code && next);

  return {
    params,
    code,
    next,
    configurationId,
    isFromVercel,
  };
}
