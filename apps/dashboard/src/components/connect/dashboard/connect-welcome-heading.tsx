import { useUser } from '@clerk/clerk-react';

export function ConnectWelcomeHeading({ completedOnboarding }: { completedOnboarding: boolean }) {
  const { user } = useUser();
  const firstName = user?.firstName?.trim();
  const title = `${firstName ? `Welcome, ${firstName}.` : 'Welcome.'}`;
  const subtitle = completedOnboarding ? `Let's get you set up.` : `Let's get your first agent live.`;

  return (
    <div className="flex items-center px-2 py-2">
      <h1 className="text-text-strong text-label-lg leading-6 text-nowrap">{title}</h1>
      <span className="ml-1 text-label-lg text-text-soft font-normal text-nowrap">{subtitle}</span>
    </div>
  );
}
