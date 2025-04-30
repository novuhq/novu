import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { refreshJwt } from './jwt-manager';

export function OrganizationList() {
  return <></>;
}

export function OrganizationProfile() {
  return <></>;
}

export function UserProfile() {
  return <></>;
}

export function SignIn() {
  const navigate = useNavigate();
  useEffect(() => {
    refreshJwt();
    navigate('/');
  });

  return <>{'Loading...'}</>;
}

export function SignUp() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/');
  });
  return <></>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function RedirectToSignIn({ children }: { children: any }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!(window as any).Clerk.loggedIn) {
      refreshJwt();
      navigate('/sign-in');
    }
  }, [navigate]);

  return <>{children}</>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SignedIn({ children }: { children: any }) {
  return <>{children}</>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SignedOut({ children }: { children: any }) {
  if ((window as any).Clerk.loggedIn) return null;

  return <>{children}</>;
}
