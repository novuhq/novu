import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../../components/primitives/input';
import { get } from '../../api/api.client';

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
    getJwt();
    navigate('/');
  });

  return <>{'Loading...'}</>;
}

export function SignUp() {
  return (
    <>
      <Input placeholder="Email" />
      <Input placeholder="Password" />
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function RedirectToSignIn({ children }: { children: any }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!(window as any).Clerk.loggedIn) {
      getJwt();
      navigate('/sign-in');
    }
  }, [navigate]);

  // if (!(window as any).Clerk.loggedIn) {
  //   console.log('RedirectToSignIn: return null');
  //   return null;
  // }

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

function getJwt() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get('/auth/self-hosted').then((result: any) => {
    localStorage.setItem('self-hosted-jwt', result?.data.token);
  });
}
