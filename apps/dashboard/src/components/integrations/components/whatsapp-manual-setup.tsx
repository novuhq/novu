import type { ReactNode } from 'react';
import { SetupButton, SetupStep, SetupStepperRail } from '@/components/agents/setup-guide-primitives';

const META_APPS_URL = 'https://developers.facebook.com/apps';
const META_SYSTEM_USERS_URL = 'https://business.facebook.com/settings/system-users';

type WhatsAppManualSetupProps = {
  /** The WhatsApp Business credential fields. */
  credentialFields: ReactNode;
};

/** Manual setup for WhatsApp: create a Meta app, paste its credentials, then swap in a token that doesn't expire. */
export function WhatsAppManualSetup({ credentialFields }: WhatsAppManualSetupProps) {
  return (
    <SetupStepperRail className="-ml-3 pb-4">
      <SetupStep
        index={1}
        status="current"
        title="Create a Meta app"
        description="Create a Business app and add the WhatsApp product."
        extraContent={<SetupButton href={META_APPS_URL}>Meta App Dashboard</SetupButton>}
      />
      <SetupStep
        index={2}
        status="current"
        title="Paste your API credentials"
        description="Find these under WhatsApp, API Setup, and App settings, Basic."
        extraContent={credentialFields}
      />
      <SetupStep
        index={3}
        status="current"
        title="Use a never-expiring token"
        description="Temporary tokens expire after 24 hours. Create a System User token in Meta Business Settings before you go live."
        extraContent={<SetupButton href={META_SYSTEM_USERS_URL}>Open Business Settings</SetupButton>}
      />
    </SetupStepperRail>
  );
}
