import { useEffect } from 'react';

import { NEW_DASHBOARD_URL } from '../../../config';

export default function SignUpPage() {
  useEffect(() => {
    window.location.href = `${NEW_DASHBOARD_URL}/auth/sign-up`;
  }, []);

  return null;
}
