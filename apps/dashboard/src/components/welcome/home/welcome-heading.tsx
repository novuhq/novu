import { useAuth } from '@/context/auth/hooks';

export function WelcomeHeading() {
  const { currentUser } = useAuth();
  const firstName = currentUser?.firstName?.trim();
  const title = firstName ? `Welcome, ${firstName}.` : 'Welcome.';

  return (
    <div className="flex items-center px-2 py-2">
      <h1 className="text-text-strong text-label-lg text-nowrap leading-6">{title}</h1>
      <span className="text-text-soft text-label-lg ml-1 text-nowrap font-normal">Let's get this setup.</span>
    </div>
  );
}
