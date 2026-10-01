import { type FormEvent, useId, useState } from 'react';
import Title from '@/components/Title';
import { novuConfig } from '@/utils/config';

const AGENT_IDENTIFIER = 'human-hitl';

const KINDS = ['approve', 'ask', 'choose', 'tell'] as const;

type Kind = (typeof KINDS)[number];

const DEFAULT_PROMPTS: Record<Kind, string> = {
  approve: 'Deploy v2.4.1 to production?',
  ask: 'What environment should we deploy to?',
  choose: 'Which region should we deploy to?',
  tell: 'Deploy finished. v2.4.1 is live.',
};

const DEFAULT_OPTIONS = 'us-east\neu-west\nap-south';

const VIA_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'slack', label: 'Slack' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'email', label: 'Email' },
] as const;

const TTL_OPTIONS = [
  { label: '1m', seconds: 60 },
  { label: '2m', seconds: 120 },
  { label: '5m', seconds: 300 },
  { label: '1h', seconds: 3600 },
  { label: '2h', seconds: 7200 },
  { label: '5h', seconds: 18000 },
  { label: '24h', seconds: 86_400 },
  { label: '48h', seconds: 172_800 },
  { label: '72h', seconds: 259_200 },
] as const;

const DEFAULT_TTL_SECONDS = 86_400;

const HELPERS = [
  {
    name: 'ctx.approve',
    trigger: 'approve',
    snippet: 'ctx.approve("Deploy v2.4.1 to production?");',
    description: 'Approve / deny card. Verdict arrives later on onAction with ctx.humanResponse.',
  },
  {
    name: 'ctx.ask',
    trigger: 'ask',
    snippet: 'ctx.ask("What environment should we deploy to?");',
    description: 'Freeform question. Reply in the thread; the answer arrives on onMessage with ctx.humanResponse.',
  },
  {
    name: 'ctx.choose',
    trigger: 'choose',
    snippet: 'ctx.choose("Which region?", ["us-east", "eu-west", "ap-south"]);',
    description: 'Pick one of 2–10 options. The option id comes back on onAction via ctx.humanResponse.',
  },
  {
    name: 'ctx.tell',
    trigger: 'tell',
    snippet: 'ctx.tell("Deploy finished. v2.4.1 is live.");',
    description: 'One-way notice. Fire-and-forget — tell never sets ctx.humanResponse.',
  },
] as const;

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors';

type CreatedInteraction = {
  id: string;
  kind: string;
  status: string;
  platform: string;
  to: string[];
};

type Status = { type: 'success'; interaction: CreatedInteraction } | { type: 'error'; message: string } | null;

function parseOptions(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

/** CLI-style `--to alice,bob`: unique subscriberIds. */
function parseSubscriberTo(raw: string): string[] | null {
  const ids = [
    ...new Set(
      raw
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
    ),
  ];

  return ids.length > 0 ? ids : null;
}

function formatSubscriberTo(to: string[]): string {
  return to.join(', ');
}

function extractError(data: Record<string, unknown>): string {
  const message = data.message;
  if (typeof message === 'string' && message.length > 0) {
    return message;
  }

  if (Array.isArray(message)) {
    return message.filter((item): item is string => typeof item === 'string').join(', ');
  }

  if (typeof data.error === 'string' && data.error.length > 0) {
    return data.error;
  }

  return 'Unknown error';
}

export default function AgentHumanPage() {
  const formId = useId();
  const kindId = `${formId}-kind`;
  const promptId = `${formId}-prompt`;
  const optionsId = `${formId}-options`;
  const toId = `${formId}-to`;
  const viaId = `${formId}-via`;
  const fromId = `${formId}-from`;
  const ttlId = `${formId}-ttl`;

  const [kind, setKind] = useState<Kind>('approve');
  const [prompt, setPrompt] = useState(DEFAULT_PROMPTS.approve);
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [to, setTo] = useState(novuConfig.subscriberId);
  const [via, setVia] = useState('');
  const [from, setFrom] = useState('playground');
  const [ttlSeconds, setTtlSeconds] = useState(DEFAULT_TTL_SECONDS);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function copyIdentifier() {
    await navigator.clipboard.writeText(AGENT_IDENTIFIER);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function handleKindChange(nextKind: Kind) {
    setKind(nextKind);
    setPrompt((current) => {
      const isDefaultPrompt = KINDS.some((candidate) => DEFAULT_PROMPTS[candidate] === current);

      return isDefaultPrompt ? DEFAULT_PROMPTS[nextKind] : current;
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const subscriberTo = parseSubscriberTo(to);
      if (!subscriberTo) {
        setStatus({ type: 'error', message: 'to must include at least one subscriberId' });

        return;
      }

      const payload: Record<string, unknown> = {
        kind,
        card: {
          title: prompt,
          ...(kind === 'choose' ? { options: parseOptions(options) } : {}),
        },
        to: subscriberTo,
        agentIdentifier: AGENT_IDENTIFIER,
        from,
        ttlSeconds,
      };

      if (via) {
        payload.via = via;
      }

      const res = await fetch('/api/human-interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as Record<string, unknown>;

      if (!res.ok) {
        setStatus({ type: 'error', message: extractError(data) });
      } else {
        setStatus({
          type: 'success',
          interaction: {
            id: String(data.id ?? ''),
            kind: String(data.kind ?? kind),
            status: String(data.status ?? ''),
            platform: String(data.platform ?? ''),
            to: Array.isArray(data.to) ? data.to.map(String) : subscriberTo,
          },
        });
      }
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6 p-6">
      <Title title="Framework HITL (ctx.ask / approve / choose / tell)" />
      <p className="text-sm text-muted-foreground">
        Create a <code className="text-foreground">HumanInteraction</code> via{' '}
        <code className="text-foreground">POST /v1/human/interactions</code> targeted at{' '}
        <code className="text-foreground">{AGENT_IDENTIFIER}</code>. Novu opens a DM the same way{' '}
        <code className="text-foreground">human_relay</code> does. When the subscriber answers,{' '}
        <code className="text-foreground">{AGENT_IDENTIFIER}</code> continues with{' '}
        <code className="text-foreground">ctx.humanResponse</code> set (<code className="text-foreground">expired</code>{' '}
        when the TTL elapsed).
      </p>

      <div className="rounded-md border p-4 space-y-3">
        <p className="text-sm">
          Agent identifier: <code className="text-foreground">{AGENT_IDENTIFIER}</code>
        </p>
        <p className="text-sm text-muted-foreground">
          Connect a channel to <code className="text-foreground">{AGENT_IDENTIFIER}</code>. The subscriber also needs a
          linked endpoint (<code className="text-foreground">human setup</code> does that). In-thread{' '}
          <code className="text-foreground">ctx.*</code> helpers are gated by{' '}
          <code className="text-foreground">IS_AGENT_HUMAN_HITL_ENABLED=true</code> on the API.
        </p>
        <button
          type="button"
          onClick={copyIdentifier}
          className="inline-flex items-center rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
        >
          {copied ? 'Copied identifier' : 'Copy agent identifier'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="rounded-md border p-4 space-y-4">
        <div className="flex flex-col gap-1">
          <label htmlFor={kindId} className="text-sm font-medium text-foreground">
            Kind
          </label>
          <select
            id={kindId}
            value={kind}
            onChange={(event) => handleKindChange(event.target.value as Kind)}
            className={inputClass}
          >
            {KINDS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={promptId} className="text-sm font-medium text-foreground">
            Prompt
          </label>
          <textarea
            id={promptId}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={3}
            required
            className={`${inputClass} resize-none`}
          />
        </div>

        {kind === 'choose' && (
          <div className="flex flex-col gap-1">
            <label htmlFor={optionsId} className="text-sm font-medium text-foreground">
              Options
            </label>
            <textarea
              id={optionsId}
              value={options}
              onChange={(event) => setOptions(event.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
            />
            <p className="text-xs text-muted-foreground">One option per line, or comma-separated. 2–10 required.</p>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor={toId} className="text-sm font-medium text-foreground">
            Subscriber id
          </label>
          <input
            id={toId}
            type="text"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            required
            placeholder="alice, bob"
            className={inputClass}
          />
          <p className="text-xs text-muted-foreground">
            One subscriberId, or comma-separated list. Any listed subscriber may settle (first valid answer wins).
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={viaId} className="text-sm font-medium text-foreground">
            Channel
          </label>
          <select id={viaId} value={via} onChange={(event) => setVia(event.target.value)} className={inputClass}>
            {VIA_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={fromId} className="text-sm font-medium text-foreground">
            From
          </label>
          <input
            id={fromId}
            type="text"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={ttlId} className="text-sm font-medium text-foreground">
            TTL
          </label>
          <select
            id={ttlId}
            value={ttlSeconds}
            onChange={(event) => setTtlSeconds(Number(event.target.value))}
            className={inputClass}
          >
            {TTL_OPTIONS.map((option) => (
              <option key={option.seconds} value={option.seconds}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating…' : 'Create human interaction'}
        </button>
      </form>

      {status?.type === 'success' && (
        <div className="p-4 rounded-md border border-green-200 bg-green-50 text-green-800 text-sm space-y-1">
          <p className="font-semibold">Interaction created</p>
          <p>
            <span className="font-medium">Id:</span> {status.interaction.id}
          </p>
          <p>
            <span className="font-medium">Status:</span> {status.interaction.status} · {status.interaction.kind} on{' '}
            {status.interaction.platform}
          </p>
          <p>
            <span className="font-medium">To:</span> {formatSubscriberTo(status.interaction.to)}
          </p>
          <p className="text-green-700">
            Answer the card in the {AGENT_IDENTIFIER} thread. The agent will continue with{' '}
            <code>ctx.humanResponse</code>.
          </p>
        </div>
      )}

      {status?.type === 'error' && (
        <div className="p-4 rounded-md border border-red-200 bg-red-50 text-red-800 text-sm">
          <p className="font-semibold">Failed to create interaction</p>
          <p className="mt-1 font-mono text-xs break-all">{status.message}</p>
        </div>
      )}

      <ul className="space-y-4">
        {HELPERS.map((helper) => (
          <li key={helper.name} className="rounded-md border p-4 space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <code className="text-sm font-semibold">{helper.name}</code>
              <span className="text-xs text-muted-foreground">message: {helper.trigger}</span>
            </div>
            <p className="text-sm text-muted-foreground">{helper.description}</p>
            <pre className="overflow-x-auto rounded bg-muted px-3 py-2 text-xs">{helper.snippet}</pre>
          </li>
        ))}
      </ul>
    </div>
  );
}
