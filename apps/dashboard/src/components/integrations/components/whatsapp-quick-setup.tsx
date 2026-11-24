import { RiArrowRightUpLine } from 'react-icons/ri';
import type { WhatsAppEmbeddedSignupResult } from '@/api/integrations';
import { SetupButton, SetupStep, SetupStepperRail } from '@/components/agents/setup-guide-primitives';
import {
  type EmbeddedSignupCompletion,
  WhatsAppEmbeddedSignupCoreButton,
} from '@/components/agents/whatsapp-embedded-signup-button';

type WhatsAppQuickSetupProps = {
  /** True once Meta's signup finished and the credentials are saved. */
  isConnected: boolean;
  /** The number that was connected, as Meta displays it. */
  connectedPhone?: string;
  /** False while the form can't create the integration yet, e.g. its name is empty. */
  canConnect: boolean;
  completeSignup: (completion: EmbeddedSignupCompletion) => Promise<WhatsAppEmbeddedSignupResult>;
};

/**
 * Quick setup for WhatsApp: Meta's Embedded Signup. The user logs in with Facebook and picks a business and
 * a phone number; Novu saves the credentials.
 */
export function WhatsAppQuickSetup({
  isConnected,
  connectedPhone,
  canConnect,
  completeSignup,
}: WhatsAppQuickSetupProps) {
  return (
    <SetupStepperRail className="-ml-3 pb-4">
      <SetupStep
        index={1}
        status={isConnected ? 'completed' : 'current'}
        title="Connect your WhatsApp Business account"
        description={
          isConnected
            ? `${connectedPhone ? `${connectedPhone} is connected` : 'Your number is connected'} and its credentials are saved.`
            : 'Log in with Facebook and pick your business and phone number. Novu saves the credentials.'
        }
        extraContent={
          isConnected ? null : (
            <WhatsAppEmbeddedSignupCoreButton
              completeSignup={completeSignup}
              disabled={!canConnect}
              renderButton={({ isLoading, disabled, onClick }) => (
                <SetupButton onClick={onClick} disabled={disabled || isLoading} className="self-start">
                  {isLoading ? 'Logging in…' : 'Log in with Facebook'}
                  <RiArrowRightUpLine className="ml-1.5 size-3 shrink-0" />
                </SetupButton>
              )}
            />
          )
        }
      />
    </SetupStepperRail>
  );
}
