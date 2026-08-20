import { HITL_APPROVE_WORKFLOW_ID } from '@novu/framework/next';
import { useState } from 'react';
import Title from '@/components/Title';
import { novuConfig } from '@/utils/config';
import { connectChatContext as context } from '@/utils/connect-chat-context';

const DEFAULT_AGENT_IDENTIFIER = process.env.NEXT_PUBLIC_NOVU_AGENT_IDENTIFIER ?? 'novu-agent';

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors';

const buttonClass =
  'inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50';

type Status = { type: 'success' | 'error'; message: string } | null;

export default function UsageLimitPage() {
  const [agentIdentifier, setAgentIdentifier] = useState(DEFAULT_AGENT_IDENTIFIER);
  const [subscriberId, setSubscriberId] = useState(novuConfig.subscriberId);
  const [action, setAction] = useState('Raise the usage limit for Acme?');
  const [from, setFrom] = useState('novu-agent');
  const [ttl, setTtl] = useState('1m');
  const [triggerStatus, setTriggerStatus] = useState<Status>(null);
  const [triggerLoading, setTriggerLoading] = useState(false);

  async function handleTrigger() {
    const identifier = agentIdentifier.trim() || DEFAULT_AGENT_IDENTIFIER;

    if (!subscriberId.trim()) {
      setTriggerStatus({ type: 'error', message: 'Subscriber ID is required' });

      return;
    }

    if (!action.trim()) {
      setTriggerStatus({ type: 'error', message: 'Action is required' });

      return;
    }

    setTriggerLoading(true);
    setTriggerStatus(null);

    try {
      const res = await fetch('/api/trigger-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: HITL_APPROVE_WORKFLOW_ID,
          to: { subscriberId: subscriberId.trim() },
          payload: {
            action: action.trim(),
            from: from.trim() || undefined,
            ttl: ttl.trim() || '24h',
          },
          agentId: identifier,
          bridgeUrl: 'https://a7393ff5-ae77-4de4-b019-7fdc30e6be67.novu.sh/api/novu',
          context,
        }),
      });
      const data = (await res.json()) as { data?: { transactionId?: string }; error?: string; message?: string };

      if (!res.ok) {
        setTriggerStatus({ type: 'error', message: data.message ?? data.error ?? `HTTP ${res.status}` });
      } else {
        const txId = data.data?.transactionId ?? '—';
        setTriggerStatus({
          type: 'success',
          message: `Triggered ${HITL_APPROVE_WORKFLOW_ID} as ${identifier}. transactionId: ${txId}. Use Approve/Deny in Slack.`,
        });
      }
    } catch (err) {
      setTriggerStatus({ type: 'error', message: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setTriggerLoading(false);
    }
  }

  return (
    <>
      <Title title="Slack approve" />
      <div className="flex w-full max-w-xl flex-col gap-8 p-4">
        <p className="text-sm text-muted-foreground">
          Trigger <code>{HITL_APPROVE_WORKFLOW_ID}</code> with <code>agentId</code> so the Approve/Deny card is sent on
          that agent&apos;s Slack connection. Clicking a button resumes the wait step.
        </p>

        <section className="flex flex-col gap-4 rounded-lg border border-border p-4">
          <div>
            <h3 className="text-base font-semibold">Trigger {HITL_APPROVE_WORKFLOW_ID}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Passes <code>agentId</code> on the trigger (workflow agent override). Sync the playground bridge first if
              the workflow is missing.
            </p>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Agent identifier
            <input
              value={agentIdentifier}
              onChange={(event) => setAgentIdentifier(event.target.value)}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Subscriber ID
            <input
              value={subscriberId}
              onChange={(event) => setSubscriberId(event.target.value)}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Action
            <input value={action} onChange={(event) => setAction(event.target.value)} className={inputClass} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium">
              From
              <input value={from} onChange={(event) => setFrom(event.target.value)} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              TTL
              <input value={ttl} onChange={(event) => setTtl(event.target.value)} className={inputClass} />
            </label>
          </div>

          <button type="button" className={buttonClass} onClick={() => void handleTrigger()} disabled={triggerLoading}>
            {triggerLoading ? 'Triggering…' : `Trigger ${HITL_APPROVE_WORKFLOW_ID}`}
          </button>

          {triggerStatus && (
            <p className={`text-sm ${triggerStatus.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
              {triggerStatus.message}
            </p>
          )}
        </section>
      </div>
    </>
  );
}
