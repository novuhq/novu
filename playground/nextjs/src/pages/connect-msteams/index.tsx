import { MsTeamsConnectButton, MsTeamsLinkUser, NovuProvider } from '@novu/nextjs';
import { useState } from 'react';
import Title from '@/components/Title';
import { novuConfig } from '@/utils/config';

const INTEGRATION_IDENTIFIER = process.env.NEXT_PUBLIC_NOVU_MSTEAMS_INTEGRATION_IDENTIFIER ?? 'msteams';
// const CONNECTION_IDENTIFIER = 'msteams-workspace-connection';
const MS_TEAMS_TEST_WORKFLOW_ID = process.env.NEXT_PUBLIC_NOVU_MSTEAMS_TEST_WORKFLOW_ID ?? '';
// const context = { key: 'value2' };
const context = undefined;

export default function ConnectMsTeamsPage() {
  const [aadOidOverride, setAadOidOverride] = useState('');
  const [dmStatus, setDmStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [dmLoading, setDmLoading] = useState(false);
  const [triggerWorkflowId, setTriggerWorkflowId] = useState(MS_TEAMS_TEST_WORKFLOW_ID);
  const [triggerStatus, setTriggerStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [triggerLoading, setTriggerLoading] = useState(false);

  const handleCreateDmEndpoint = async () => {
    setDmLoading(true);
    setDmStatus(null);

    try {
      const res = await fetch('/api/msteams-dm-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriberId: novuConfig.subscriberId,
          integrationIdentifier: INTEGRATION_IDENTIFIER,
          ...(aadOidOverride.trim() && { aadObjectIdOverride: aadOidOverride.trim() }),
        }),
      });

      const data = (await res.json()) as { aadObjectId?: string; error?: string };

      if (!res.ok || data.error) {
        setDmStatus({ type: 'error', message: data.error ?? 'Unknown error' });
      } else {
        setDmStatus({
          type: 'success',
          message: `MS_TEAMS_USER endpoint created for AAD Object ID: ${data.aadObjectId}`,
        });
      }
    } catch (err) {
      setDmStatus({ type: 'error', message: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setDmLoading(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!triggerWorkflowId.trim()) {
      setTriggerStatus({ type: 'error', message: 'Workflow ID is required' });

      return;
    }

    setTriggerLoading(true);
    setTriggerStatus(null);

    try {
      const res = await fetch('/api/trigger-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: triggerWorkflowId.trim(),
          to: { subscriberId: novuConfig.subscriberId },
          payload: { message: 'Test message from connect-msteams playground' },
          ...(context ? { context } : {}),
        }),
      });

      const data = (await res.json()) as { data?: { transactionId?: string }; error?: string; message?: string };

      if (!res.ok) {
        setTriggerStatus({ type: 'error', message: data.message ?? data.error ?? `HTTP ${res.status}` });
      } else {
        const txId = data.data?.transactionId ?? '—';

        setTriggerStatus({ type: 'success', message: `Triggered ✓  transactionId: ${txId}` });
      }
    } catch (err) {
      setTriggerStatus({ type: 'error', message: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setTriggerLoading(false);
    }
  };

  return (
    <>
      <Title title="Connect MS Teams Components" />
      <div className="flex flex-col gap-8 p-4 max-w-xl">
        <section className="flex flex-col gap-3">
          <h4 className="text-sm font-semibold">
            Step 1 — MsTeamsConnectButton: OAuth admin consent with endpoint configuration
          </h4>
          <p className="text-xs text-muted-foreground">
            Starts the MS Teams admin consent flow (<code>/adminconsent</code>). OAuth stores a{' '}
            <code>ChannelConnection</code> for the tenant automatically — the Step 2 Link User flow is optional.
          </p>
          <NovuProvider {...novuConfig} context={context}>
            <MsTeamsConnectButton
              integrationIdentifier={INTEGRATION_IDENTIFIER}
              // connectLabel="Connect to MS Teams AAA"
              // connectedLabel="Connected to MS Teams AAA"
              appearance={{
                elements: {
                  // Callback: hide only when connected, show when not connected
                  channelConnectButtonIcon: ({ connected }) => (connected ? 'nt-hidden' : ''),
                },
              }}
              // connectionIdentifier={CONNECTION_IDENTIFIER}
              // connectionMode="shared"
              onConnectError={(error) => console.error(error)}
              autoLinkUser={false}
            />
          </NovuProvider>

          <NovuProvider {...novuConfig}>
            <MsTeamsConnectButton
              integrationIdentifier={INTEGRATION_IDENTIFIER}
              connectLabel="Connect to MS Teams BBB"
              connectedLabel="Connected to MS Teams BBB"
              appearance={{
                icons: {
                  channelConnect: ({ class: cls }) => (
                    <svg className={cls} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M5 8h6M8 5v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  ),
                  channelConnected: ({ class: cls }) => (
                    <svg className={cls} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                      <path
                        d="M5.5 8l2 2 3-3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ),
                },
              }}
            />
          </NovuProvider>
        </section>

        <section className="flex flex-col gap-3">
          <h4 className="text-sm font-semibold">Step 2 — MsTeamsLinkUser: Link subscriber via delegated OAuth</h4>
          <p className="text-xs text-muted-foreground">
            Starts a Microsoft delegated OAuth flow (<code>User.Read</code> scope) to resolve the subscriber&apos;s AAD
            Object ID and create a <code>ChannelEndpoint</code> of type <code>ms_teams_user</code>. Requires admin
            consent from Step 1.
          </p>
          <NovuProvider {...novuConfig} context={context}>
            <MsTeamsLinkUser
              integrationIdentifier={INTEGRATION_IDENTIFIER}
              appearance={{
                elements: {
                  linkMsTeamsUserButtonIcon: ({ linked }) => (linked ? '' : 'nt-hidden'),
                },
              }}
              // connectionIdentifier={CONNECTION_IDENTIFIER}
            />
          </NovuProvider>

          <NovuProvider {...novuConfig}>
            <MsTeamsLinkUser
              integrationIdentifier={INTEGRATION_IDENTIFIER}
              appearance={{
                icons: {
                  channelConnect: ({ class: cls }) => (
                    <svg className={cls} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M5 8h6M8 5v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  ),
                  channelConnected: ({ class: cls }) => (
                    <svg className={cls} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                      <path
                        d="M5.5 8l2 2 3-3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ),
                },
              }}
            />
          </NovuProvider>
        </section>

        <section className="flex flex-col gap-3">
          <h4 className="text-sm font-semibold">Step 3 — Server-side DM Endpoint: Register AAD Object ID directly</h4>
          <p className="text-xs text-muted-foreground">
            Calls <code>/api/msteams-dm-endpoint</code> to create an <code>ms_teams_user</code>{' '}
            <code>ChannelEndpoint</code> using a known AAD Object ID. Use this when you already have the user&apos;s AAD
            Object ID from your own directory (e.g. Microsoft Entra / Azure AD), bypassing the delegated OAuth flow.
          </p>
          <input
            type="text"
            value={aadOidOverride}
            onChange={(e) => setAadOidOverride(e.target.value)}
            placeholder="AAD Object ID (optional — uses NEXT_PUBLIC_MS_TEAMS_AAD_OBJECT_ID if unset)"
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={handleCreateDmEndpoint}
            disabled={dmLoading}
            className="self-start rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {dmLoading ? 'Creating…' : 'Create DM Endpoint'}
          </button>
          {dmStatus && (
            <p className={`text-xs ${dmStatus.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
              {dmStatus.message}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h4 className="text-sm font-semibold">
            Step 4 — Send Test Message: Trigger a workflow via <code>/v1/events/trigger</code>
          </h4>
          <p className="text-xs text-muted-foreground">
            Calls the Novu trigger engine to dispatch a workflow to the current subscriber. Use this to verify the full
            e2e path: admin consent → user linking → message delivery via the MS Teams bot.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={triggerWorkflowId}
              onChange={(e) => setTriggerWorkflowId(e.target.value)}
              placeholder="workflow-id (e.g. msteams-dm-test)"
              className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              onClick={handleSendTestMessage}
              disabled={triggerLoading || !triggerWorkflowId.trim()}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {triggerLoading ? 'Sending…' : 'Send'}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Subscriber: <code>{novuConfig.subscriberId}</code>
          </p>
          {triggerStatus && (
            <p className={`text-xs ${triggerStatus.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
              {triggerStatus.message}
            </p>
          )}
        </section>
      </div>
    </>
  );
}
