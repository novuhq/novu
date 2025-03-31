import { useEffect } from 'react';

import { useVercelParams } from '../../../hooks/useVercelParams';
import { NEW_DASHBOARD_URL } from '../../../config';

export default function SignUpPage() {
  const { params, isFromVercel } = useVercelParams();

  useEffect(() => {
    if (isFromVercel) {
      localStorage.setItem(
        'vercel_redirect_data',
        JSON.stringify({
          params: params.toString(),
          isFromVercel,
          date: new Date().toISOString(),
        })
      );
    }
    window.location.href = `${NEW_DASHBOARD_URL}/auth/sign-up`;
  }, [isFromVercel, params]);

  return null;
}
