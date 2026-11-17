'use client';

import { ArrowLeft } from 'lucide-react';
import { type FormEvent, type ReactNode, useId, useState } from 'react';

import {
  type ConnectWhatsAppKeysResult,
  connectWhatsAppKeysAction,
} from '@/app/(account)/(dashboard)/channels/actions';
import { FieldError, FOCUSED_INPUT } from '@/components/channels/setup-parts';
import { Button } from '@/components/ui/button';
import { CopyField } from '@/components/ui/copy-field';
import { Field, Input } from '@/components/ui/input';
import { Step } from '@/components/ui/stepper';
import type { WhatsAppKeys, WhatsAppWebhook } from '@/lib/human-channels-api';

type KeysState =
  | { step: 'connect' }
  | { step: 'verify'; displayPhoneNumber?: string }
  | { step: 'connected'; displayPhoneNumber?: string; operatorPhoneNumber?: string };

type ConnectedKeys = Extract<ConnectWhatsAppKeysResult, { ok: true }>;

/** The step that has the operator say hi from their own WhatsApp: its body, and its footer's status. */
export type SendCodeParts = { body: ReactNode; footer: ReactNode };

type WhatsAppKeysStepsProps = {
  state: KeysState;
  /** Step 3: the code to send from the operator's own WhatsApp, as the Facebook way has it. */
  sendCode: SendCodeParts;
  /** What closes the steps once all three are done: WhatsApp is on, and the first message. */
  whatsAppOn: ReactNode;
  onConnected: (result: ConnectedKeys) => void;
  /** Back to the Facebook button. None where this deployment has no Facebook button, or once keys are saved. */
  onUseFacebook?: () => void;
  /** A webhook a keys setup still has to add, as the API remembers it after a reload or a closed drawer. */
  webhook?: WhatsAppWebhook;
};

/**
 * Connecting WhatsApp with keys from a Meta app the operator set up themselves: paste the keys, which the API
 * checks with Meta and saves; add the webhook in Meta, unless the API could set it for them; then say hi from
 * their own WhatsApp with the code, as with the Facebook button.
 */
export function WhatsAppKeysSteps({
  state,
  sendCode,
  whatsAppOn,
  onConnected,
  onUseFacebook,
  webhook: savedWebhook,
}: WhatsAppKeysStepsProps) {
  const [webhook, setWebhook] = useState<WhatsAppWebhook | undefined>(savedWebhook);
  const [webhookAdded, setWebhookAdded] = useState(false);

  const linked = state.step !== 'connect';
  // Linked with no webhook to add (Meta took it, or Novu's own app), or the operator says they added it.
  const webhookDone = linked && (!webhook || webhook.configured || webhookAdded);
  const ownNumber = state.step === 'connected' ? state.operatorPhoneNumber : undefined;

  return (
    <>
      <KeysStep
        linked={linked}
        businessNumber={linked ? state.displayPhoneNumber : undefined}
        onUseFacebook={onUseFacebook}
        onConnected={(result) => {
          setWebhook(result.webhook);
          onConnected(result);
        }}
      />

      <WebhookStep
        status={!linked ? 'upcoming' : webhookDone ? 'done' : 'current'}
        webhook={webhook}
        onAdded={() => setWebhookAdded(true)}
      />

      <Step
        index={3}
        title="Say hi on WhatsApp"
        status={state.step === 'connected' ? 'done' : webhookDone ? 'current' : 'upcoming'}
        summary={ownNumber ? `Message received from ${ownNumber}` : 'Your number is connected'}
        footer={sendCode.footer}
        glow
      >
        {state.step === 'verify' && webhookDone && sendCode.body}
      </Step>

      {whatsAppOn}
    </>
  );
}

const NO_KEYS: WhatsAppKeys = { accessToken: '', phoneNumberId: '', businessAccountId: '', appSecret: '' };

type KeysStepProps = {
  linked: boolean;
  businessNumber?: string;
  onUseFacebook?: () => void;
  onConnected: (result: ConnectedKeys) => void;
};

/** Step 1: the four keys from the Meta app, which the API checks with Meta before it saves anything. */
function KeysStep({ linked, businessNumber, onUseFacebook, onConnected }: KeysStepProps) {
  const formId = useId();
  const [keys, setKeys] = useState<WhatsAppKeys>(NO_KEYS);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setChecking(true);
    setError(undefined);
    const result = await connectWhatsAppKeysAction(keys).catch(
      (): ConnectWhatsAppKeysResult => ({ ok: false, error: 'Something went wrong. Please try again.' })
    );
    setChecking(false);
    if (!result.ok) {
      setError(result.error);

      return;
    }

    // The secrets leave the page's memory once the API has them.
    setKeys(NO_KEYS);
    onConnected(result);
  };

  const input = (key: keyof WhatsAppKeys, secret = false) => ({
    value: keys[key],
    onChange: (event: { target: { value: string } }) =>
      setKeys((current) => ({ ...current, [key]: event.target.value })),
    autoComplete: 'off',
    spellCheck: false,
    className: FOCUSED_INPUT,
    ...(secret ? { type: 'password' } : { inputMode: 'numeric' as const }),
  });

  return (
    <Step
      index={1}
      title="Paste your Meta keys"
      status={linked ? 'done' : error ? 'error' : 'current'}
      summary={businessNumber ? `${businessNumber} · keys saved` : 'Keys saved'}
      footer={
        <>
          {onUseFacebook && (
            <button
              type="button"
              onClick={onUseFacebook}
              className="flex cursor-pointer items-center gap-1.5 text-xs text-secondary transition-colors duration-150 hover:text-foreground motion-reduce:transition-none"
            >
              <ArrowLeft aria-hidden="true" className="size-[13px]" />
              Use Facebook instead
            </button>
          )}
          <Button type="submit" form={formId} pending={checking} className="ml-auto">
            Check keys
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={(event) => void submit(event)} className="flex flex-col gap-3.5">
        <Field label="Access token" hint="Use a System User token. Tokens from API Setup expire after 24 hours.">
          {(props) => <Input {...props} {...input('accessToken', true)} />}
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Phone number ID">{(props) => <Input {...props} {...input('phoneNumberId')} />}</Field>
          <Field label="Business account ID">{(props) => <Input {...props} {...input('businessAccountId')} />}</Field>
        </div>
        <Field label="App secret">
          {(props) => <Input {...props} {...input('appSecret', true)} placeholder="From App settings › Basic" />}
        </Field>
        {error && (
          <p role="alert" className="text-xs leading-4 text-danger">
            <FieldError>{error}</FieldError>
          </p>
        )}
      </form>
    </Step>
  );
}

type WebhookStepProps = {
  status: 'upcoming' | 'current' | 'done';
  webhook?: WhatsAppWebhook;
  onAdded: () => void;
};

/**
 * Step 2: where Meta sends the number's messages. Set for the operator when Meta let the API do it; otherwise the
 * callback URL and verify token to paste into their Meta app.
 */
function WebhookStep({ status, webhook, onAdded }: WebhookStepProps) {
  return (
    <Step
      index={2}
      title="Add the webhook in Meta"
      status={status}
      summary={webhook?.configured ? 'Set in your Meta app for you' : 'Added in your Meta app'}
      footer={
        <Button className="ml-auto" onClick={onAdded}>
          I added it
        </Button>
      }
    >
      {webhook && !webhook.configured && (
        <>
          <p className="text-[13px] leading-4.5 text-secondary">
            In your Meta app, open WhatsApp › Configuration and edit the webhook. Paste these two, verify and save, then
            subscribe to the <span className="font-mono text-default">messages</span> field.
          </p>
          <CopyRow label="Callback URL" value={webhook.callbackUrl} />
          {webhook.verifyToken && <CopyRow label="Verify token" value={webhook.verifyToken} />}
          {webhook.reason && <p className="text-xs leading-4 text-muted">Why it isn’t set already: {webhook.reason}</p>}
        </>
      )}
    </Step>
  );
}

/** One value to paste into Meta, named as Meta's form names it. */
function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs leading-4 font-medium text-foreground">{label}</p>
      <CopyField value={value} label={`Copy the ${label.toLowerCase()}`} />
    </div>
  );
}
