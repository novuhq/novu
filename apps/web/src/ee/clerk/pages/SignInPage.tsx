import { useEffect } from 'react';

import { NEW_DASHBOARD_URL } from '../../../config';

export default function SignInPage() {
  useEffect(() => {
    window.location.href = `${NEW_DASHBOARD_URL}/auth/sign-in`;
  }, []);

  return null;
}
