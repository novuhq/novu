import { Smartphone } from 'lucide-react';
import { useEffect } from 'react';
import { post } from '@/api/api.client';
import { showErrorToast } from '../primitives/sonner-helpers';

const MOBILE_WIDTH_THRESHOLD = 768;
const ONE_HOUR_MS = 60 * 60 * 1000;
const MOBILE_SETUP_STORAGE_KEY = 'mobileSetupEmailSentAt';

export function MobileMessage() {
  useEffect(() => {
    const notifyMobileSetup = async () => {
      try {
        const isMobile = window.innerWidth < MOBILE_WIDTH_THRESHOLD;
        const lastSentAt = localStorage.getItem(MOBILE_SETUP_STORAGE_KEY);

        const now = Date.now();
        const shouldSendEmail = !lastSentAt || now - parseInt(lastSentAt) > ONE_HOUR_MS;

        if (isMobile && shouldSendEmail) {
          localStorage.setItem(MOBILE_SETUP_STORAGE_KEY, now.toString());

          await post('/support/mobile-setup', {});
        }
      } catch (e) {
        showErrorToast('Failed to send mobile setup email, please visit this page from Desktop.');
      }
    };

    notifyMobileSetup();
  }, []);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center space-y-6 px-4 text-center">
      <div className="rounded-full bg-gray-100 p-4 dark:bg-gray-800">
        <Smartphone className="h-8 w-8 text-gray-500" />
      </div>
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Desktop Setup Required</h1>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-950">👋 Hey, You're Almost There!</p>
          <p className="text-sm font-medium text-gray-950">
            We see you signed up from your mobile—nice move! But to complete the Novu setup, you'll need to switch over
            to your laptop and fire up your favorite IDE.
          </p>
          <p className="text-sm text-gray-500">
            Integrating Novu into your stack means writing some actual code, setting up workflows, configuring Inbox ,
            and composing your first email.
          </p>
          <p className="text-primary text-sm font-medium">
            Check your inbox! We've sent you the setup instructions to get started.
          </p>
        </div>
      </div>
    </div>
  );
}
