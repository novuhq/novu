import { useMemo } from 'react';
import { HOMEPAGE_SUBTITLE, WELCOME_MESSAGES } from '../constants/home-page';

export function WelcomeHeader() {
  const randomGreeting = useMemo(() => WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)], []);

  return (
    <div className="flex flex-col gap-0.5 items-start justify-center">
      <div className="text-label-xl text-text-strong">
        <p>{randomGreeting}</p>
      </div>
      <div className="flex flex-col items-start justify-start w-full">
        <div className="text-label-md text-text-soft">
          <p>{HOMEPAGE_SUBTITLE}</p>
        </div>
      </div>
    </div>
  );
}
