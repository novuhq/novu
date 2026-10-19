import { useEffect } from 'react';
import { LEGACY_DASHBOARD_URL } from '@/config';

export const RedirectToLegacyStudioAuth = () => {
  useEffect(() => {
    const url = new URL(`${LEGACY_DASHBOARD_URL}/local-studio/auth`);
    const searchParams = new URLSearchParams(window.location.search);

    searchParams.append('studio_path_hint', '/studio');
    url.search = searchParams.toString();

    window.location.href = url.toString();
  }, []);

  return null;
};
