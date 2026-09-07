import { useCallback, useEffect, useId, useState } from 'react';
import { isValidOpsgenieApiKey } from '@/lib/opsgenie-endpoint-connect';

const INTEGRATION_IDENTIFIER = process.env.NEXT_PUBLIC_CONNECT_OPSGENIE_INTEGRATION_IDENTIFIER ?? '';
const OPSGENIE_TEST_WORKFLOW_ID = process.env.NEXT_PUBLIC_CONNECT_OPSGENIE_TEST_WORKFLOW_ID ?? '';
const API_KEY_LENGTH = 36;

type OpsgenieEndpoint = {
  identifier: string;
  subscriberId: string | null;
  integrationIdentifier: string | null;
  connectionIdentifier: string | null;
  endpoint: { apiKey: string; region: 'us' | 'eu' };
  updatedAt: string;
};

type Status = { type: 'success' | 'error' | 'info'; message: string } | null;

type Props = {
  subscriberId: string;
};

function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 4) {
    return '••••';
  }

  return `••••${apiKey.slice(-4)}`;
}

/**
 * End-user Opsgenie connect UI.
 *
 * Data flow:
 *   [browser] → POST /api/opsgenie-endpoint   (customer's Next.js backend)
 *             → POST /v1/channel-endpoints    (Novu API, with the customer's secret key)
 *
 * The API key is entered plaintext into the form and posted to the customer's
 * server, which forwards it to Novu. The Novu API stores it encrypted on the
 * linked ChannelConnection and returns the full wire shape on read; this UI
 * masks it client-side to match the dashboard convention.
 */
export function OpsgenieEndUserConnect({ subscriberId }: Props) {
  const apiKeyId = useId();
  const regionId = useId();
  const workflowIdInputId = useId();
  const [apiKey, setApiKey] = useState('');
  const [region, setRegion] = useState<'us' | 'eu'>('us');
  const [workflowId, setWorkflowId] = useState(OPSGENIE_TEST_WORKFLOW_ID);
  const [endpoints, setEndpoints] = useState<OpsgenieEndpoint[]>([]);
  const [status, setStatus] = useState<Status>(null);
  const [triggerStatus, setTriggerStatus] = useState<Status>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!INTEGRATION_IDENTIFIER) {
      return;
    }

    setLoading(true);

    try {
      const params = new URLSearchParams({
        subscriberId,
        integrationIdentifier: INTEGRATION_IDENTIFIER,
      });
      const res = await fetch(`/api/opsgenie-endpoint?${params.toString()}`);
      const data = (await res.json()) as { endpoints?: OpsgenieEndpoint[]; error?: string };

      if (!res.ok) {
        setStatus({ type: 'error', message: data.error ?? `HTTP ${res.status}` });

        return;
      }

      setEndpoints(data.endpoints ?? []);
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setLoading(false);
    }
  }, [subscriberId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isKeyValid = isValidOpsgenieApiKey(apiKey);
  const alreadyConnected = endpoints.length > 0;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isKeyValid) {
      setStatus({
        type: 'error',
        message: 'API key must be a UUID-format key from an Opsgenie API integration',
      });

      return;
    }

    setSaving(true);
    setStatus(null);

    try {
      const res = await fetch('/api/opsgenie-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriberId,
          apiKey,
          region,
          integrationIdentifier: INTEGRATION_IDENTIFIER,
        }),
      });

      const data = (await res.json()) as {
        endpoint?: OpsgenieEndpoint;
        rotated?: boolean;
        error?: string;
      };

      if (!res.ok || !data.endpoint) {
        setStatus({ type: 'error', message: data.error ?? `HTTP ${res.status}` });

        return;
      }

      setStatus({
        type: 'success',
        message: data.rotated
          ? 'Opsgenie API key rotated'
          : 'Opsgenie connected. Novu will alert this subscriber via the linked API integration',
      });
      setApiKey('');
      await refresh();
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (identifier: string) => {
    setDeletingId(identifier);
    setStatus(null);

    try {
      const params = new URLSearchParams({ identifier });
      const res = await fetch(`/api/opsgenie-endpoint?${params.toString()}`, { method: 'DELETE' });
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setStatus({ type: 'error', message: data.error ?? `HTTP ${res.status}` });

        return;
      }

      setStatus({ type: 'info', message: 'Opsgenie endpoint removed' });
      await refresh();
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleTrigger = async () => {
    const trimmedWorkflowId = workflowId.trim();

    if (!trimmedWorkflowId) {
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
          name: trimmedWorkflowId,
          to: { subscriberId },
          payload: {
            message: 'Test alert from Opsgenie end-user connect playground',
          },
        }),
      });

      const data = (await res.json()) as {
        data?: { transactionId?: string };
        error?: string;
        message?: string;
      };

      if (!res.ok) {
        setTriggerStatus({ type: 'error', message: data.message ?? data.error ?? `HTTP ${res.status}` });

        return;
      }

      const transactionId = data.data?.transactionId ?? 'n/a';

      setTriggerStatus({
        type: 'success',
        message: `Workflow triggered. transactionId: ${transactionId}. Check Opsgenie if this subscriber has a connected endpoint.`,
      });
    } catch (err) {
      setTriggerStatus({ type: 'error', message: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setTriggerLoading(false);
    }
  };

  if (!INTEGRATION_IDENTIFIER) {
    return (
      <p className="text-sm text-muted-foreground">
        Set <code>NEXT_PUBLIC_CONNECT_OPSGENIE_INTEGRATION_IDENTIFIER</code> in <code>playground/nextjs/.env</code>,
        then restart the dev server.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={apiKeyId} className="text-xs font-medium">
            Opsgenie API integration key
          </label>
          <input
            id={apiKeyId}
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value.trim())}
            placeholder="UUID-format key from your Opsgenie API integration"
            className="rounded-md border border-input bg-background px-3 py-1.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            maxLength={API_KEY_LENGTH}
            autoComplete="off"
            spellCheck={false}
            required
          />
          <p className="text-xs text-muted-foreground">
            Find it under <em>Settings → Integrations</em> (or a team&apos;s integrations) in Opsgenie. Account-level
            API Key Management keys are rejected by the Alert API. Novu stores it encrypted; it never leaves the
            customer&apos;s backend as plaintext beyond the initial POST.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={regionId} className="text-xs font-medium">
            Region
          </label>
          <select
            id={regionId}
            value={region}
            onChange={(e) => setRegion(e.target.value as 'us' | 'eu')}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="us">US (api.opsgenie.com)</option>
            <option value="eu">EU (api.eu.opsgenie.com)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={saving || !isKeyValid}
          className="self-start rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : alreadyConnected ? 'Rotate API key' : 'Connect Opsgenie'}
        </button>

        {status && (
          <p
            className={`text-xs ${
              status.type === 'success'
                ? 'text-green-600'
                : status.type === 'error'
                  ? 'text-destructive'
                  : 'text-muted-foreground'
            }`}
          >
            {status.message}
          </p>
        )}
      </form>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Existing Opsgenie endpoints</h4>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="text-xs text-muted-foreground underline hover:text-foreground disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {endpoints.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No Opsgenie endpoints yet for subscriber <code>{subscriberId}</code>.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {endpoints.map((endpoint) => (
              <li
                key={endpoint.identifier}
                className="flex items-center justify-between rounded-md border border-input px-3 py-2 text-xs"
              >
                <div className="flex flex-col">
                  <span className="font-mono">
                    {maskApiKey(endpoint.endpoint.apiKey)} · region {endpoint.endpoint.region}
                  </span>
                  <span className="text-muted-foreground">
                    {endpoint.identifier} · updated {new Date(endpoint.updatedAt).toLocaleString()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDisconnect(endpoint.identifier)}
                  disabled={deletingId === endpoint.identifier}
                  className="rounded-md border border-input px-2 py-1 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                >
                  {deletingId === endpoint.identifier ? 'Removing…' : 'Disconnect'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-input pt-6">
        <h4 className="text-sm font-semibold">Trigger workflow</h4>
        <p className="text-xs text-muted-foreground">
          Dispatches a Novu workflow to subscriber <code>{subscriberId}</code> via <code>/v1/events/trigger</code>. The
          workflow must include an Opsgenie tool step targeting the same integration. Novu routes the alert through the
          endpoint above.
        </p>
        <div className="flex flex-col gap-1">
          <label htmlFor={workflowIdInputId} className="text-xs font-medium">
            Workflow ID
          </label>
          <div className="flex items-center gap-2">
            <input
              id={workflowIdInputId}
              type="text"
              value={workflowId}
              onChange={(e) => setWorkflowId(e.target.value)}
              placeholder="workflow-id (e.g. opsgenie-alert-test)"
              className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => void handleTrigger()}
              disabled={triggerLoading || !workflowId.trim()}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {triggerLoading ? 'Triggering…' : 'Trigger'}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Optional default: set <code>NEXT_PUBLIC_CONNECT_OPSGENIE_TEST_WORKFLOW_ID</code> in{' '}
            <code>playground/nextjs/.env</code>.
          </p>
        </div>
        {endpoints.length === 0 && (
          <p className="text-xs text-amber-600">
            No Opsgenie endpoint connected yet. The tool step will be skipped until you connect an API key.
          </p>
        )}
        {triggerStatus && (
          <p
            className={`text-xs ${
              triggerStatus.type === 'success'
                ? 'text-green-600'
                : triggerStatus.type === 'error'
                  ? 'text-destructive'
                  : 'text-muted-foreground'
            }`}
          >
            {triggerStatus.message}
          </p>
        )}
      </div>
    </div>
  );
}
