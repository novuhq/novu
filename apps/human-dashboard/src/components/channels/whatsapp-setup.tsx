'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { connectWhatsAppAction, loadWhatsAppSetupAction } from '@/app/(account)/(dashboard)/channels/actions';
import { ConnectedCard, DRAWER_FOOTER, DRAWER_HEADER, FieldError, SetupCheck } from '@/components/channels/setup-parts';
import { WhatsAppSignupButton } from '@/components/channels/whatsapp-signup-button';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent } from '@/components/ui/drawer';
import { Step, Stepper } from '@/components/ui/stepper';
import { toast } from '@/components/ui/toast';
import type { WhatsAppSetupState } from '@/lib/human-whatsapp-setup';

/** `checking` and `unreadable` only happen when the page couldn't read the setup and the drawer has to. */
type DrawerState =
  | { step: 'checking' }
  | { step: 'unreadable' }
  | { step: 'not-offered' }
  | { step: 'connect'; appId: string; configId: string }
  | { step: 'connected'; displayPhoneNumber?: string };

type WhatsAppSetupProps = {
  /** How far the setup got when the page loaded, so the drawer has something to show the moment it opens. */
  setup: WhatsAppSetupState;
  /** How the agent is called in a sentence: its address without the domain. */
  handle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * The drawer that connects the operator's own WhatsApp Business account with Meta's Facebook button. The
 * Configure page's channels open it, and so does the last step of the onboarding.
 */
export function WhatsAppSetup({ setup, handle, open, onOpenChange }: WhatsAppSetupProps) {
  const router = useRouter();
  const [state, setState] = useState<DrawerState>(drawerStateOf(setup));
  const [error, setError] = useState<string>();

  const check = useCallback(async () => {
    setState({ step: 'checking' });
    const next = await loadWhatsAppSetupAction().catch((): WhatsAppSetupState => ({ step: 'unknown' }));
    setState(drawerStateOf(next));
    if (next.step === 'connected') {
      router.refresh();
    }
  }, [router]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setError(undefined);
    if (setup.step === 'unknown') {
      void check();
    } else {
      setState(drawerStateOf(setup));
    }
  }, [open, setup, check]);

  const number = state.step === 'connected' ? state.displayPhoneNumber : undefined;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        title="Set up WhatsApp"
        description={`Give ${handle} your own WhatsApp Business number. About two minutes.`}
        headerClassName={DRAWER_HEADER}
        footerClassName={DRAWER_FOOTER}
        footer={
          state.step === 'connected' && (
            <DrawerClose asChild>
              <Button>Done</Button>
            </DrawerClose>
          )
        }
      >
        {(state.step === 'checking' || state.step === 'unreadable') && (
          <SetupCheck
            state={state.step === 'checking' ? 'checking' : 'unavailable'}
            channel="WhatsApp"
            onRetry={() => void check()}
          />
        )}
        {state.step === 'not-offered' && (
          <p className="text-[13px] leading-4.5 text-secondary">
            WhatsApp can’t be connected here yet. Nothing was changed.
          </p>
        )}
        {(state.step === 'connect' || state.step === 'connected') && (
          <Stepper>
            <Step
              index={1}
              title="Connect your WhatsApp Business account"
              status={state.step === 'connected' ? 'done' : error ? 'error' : 'current'}
              summary={number ? `${number} · connected` : 'Business number connected'}
            >
              <p className="text-[13px] leading-4.5 text-secondary">
                Sign in with Facebook and pick your Meta business, then the number {handle} should use. You need a Meta
                business and a phone number that isn’t on WhatsApp yet; Facebook walks you through adding one.
              </p>
              {state.step === 'connect' && (
                <WhatsAppSignupButton
                  appId={state.appId}
                  configId={state.configId}
                  connect={connectWhatsAppAction}
                  onConnected={(result) => {
                    setError(undefined);
                    setState({ step: 'connected', displayPhoneNumber: result.displayPhoneNumber });
                    if (result.warning) {
                      toast(result.warning, 'error');
                    }
                    router.refresh();
                  }}
                  onError={setError}
                />
              )}
              {error && (
                <p role="alert" className="text-xs leading-4 text-danger">
                  <FieldError>{error}</FieldError>
                </p>
              )}
            </Step>

            {state.step === 'connected' && (
              <ConnectedCard via="whatsapp" title="WhatsApp connected">
                {number ? `${handle} can now send from ${number}.` : `${handle} has its WhatsApp Business number.`}
              </ConnectedCard>
            )}
          </Stepper>
        )}
      </DrawerContent>
    </Drawer>
  );
}

function drawerStateOf(setup: WhatsAppSetupState): DrawerState {
  switch (setup.step) {
    case 'unknown':
      return { step: 'unreadable' };
    case 'hidden':
    case 'unavailable':
      return { step: 'not-offered' };
    case 'connect':
      return setup;
    case 'connected':
      return setup;
    default: {
      const exhaustive: never = setup;

      return exhaustive;
    }
  }
}
