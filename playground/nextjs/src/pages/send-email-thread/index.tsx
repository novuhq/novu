import { useState } from 'react';
import Title from '@/components/Title';

type ThreadMessage = {
  from: string;
  to: string;
  body: string;
};

type SentMessage = {
  messageId: string;
  from: string;
  to: string;
  body: string;
};

type Status = { type: 'success'; thread: SentMessage[] } | { type: 'error'; message: string } | null;

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors';

const DEFAULT_FROM = 'george@novu.co';
const DEFAULT_TO = 'aaa@dima.notifire.co';

const defaultMessages = (from: string, to: string): ThreadMessage[] => [
  { from: from || DEFAULT_FROM, to: to || DEFAULT_TO, body: 'Hi, I wanted to reach out about the recent update.' },
  {
    from: to || DEFAULT_TO,
    to: from || DEFAULT_FROM,
    body: 'Thanks for reaching out! Happy to help — what would you like to know?',
  },
  {
    from: from || DEFAULT_FROM,
    to: to || DEFAULT_TO,
    body: 'I was wondering about the new inbound email feature. How does it work?',
  },
];

export default function SendEmailThreadPage() {
  const [globalFrom, setGlobalFrom] = useState(DEFAULT_FROM);
  const [globalTo, setGlobalTo] = useState(DEFAULT_TO);
  const [subject, setSubject] = useState('');
  const [messages, setMessages] = useState<ThreadMessage[]>(() => defaultMessages(DEFAULT_FROM, DEFAULT_TO));
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  function handleMessageChange(index: number, field: keyof ThreadMessage, value: string) {
    setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  }

  function addMessage() {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      return [
        ...prev,
        {
          from: last ? last.to : globalTo || DEFAULT_TO,
          to: last ? last.from : globalFrom || DEFAULT_FROM,
          body: '',
        },
      ];
    });
  }

  function removeMessage(index: number) {
    setMessages((prev) => prev.filter((_, i) => i !== index));
  }

  function swapParticipants() {
    setMessages((prev) => prev.map((m) => ({ ...m, from: m.to, to: m.from })));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch('/api/send-email-thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          messages,
          defaultFrom: globalFrom || undefined,
          defaultTo: globalTo || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus({ type: 'error', message: data.error ?? 'Unknown error' });
      } else {
        setStatus({ type: 'success', thread: data.thread });
      }
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-2xl">
      <Title title="Send Email Thread" />
      <p className="text-sm text-muted-foreground mb-6 mt-1">
        Simulates an email thread by sending multiple messages linked via{' '}
        <code className="font-mono bg-muted px-1 rounded">In-Reply-To</code> and{' '}
        <code className="font-mono bg-muted px-1 rounded">References</code> headers — native RFC 2822 threading, no
        hacks. Uses the SMTP server from <code className="font-mono bg-muted px-1 rounded">.env</code>.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">Default From</label>
            <input
              type="email"
              value={globalFrom}
              onChange={(e) => setGlobalFrom(e.target.value)}
              placeholder="george@novu.co  (default: SMTP_FROM)"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">Default To</label>
            <input
              type="email"
              value={globalTo}
              onChange={(e) => setGlobalTo(e.target.value)}
              placeholder="aaa@dima.notifire.co  (default: SMTP_TO)"
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Test thread from Novu playground"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Thread Messages</h3>
            <button
              type="button"
              onClick={swapParticipants}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Swap all from/to
            </button>
          </div>

          {messages.map((msg, i) => (
            <div key={i} className="rounded-lg border border-border bg-muted/30 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Message {i + 1}
                  {i === 0 ? ' (initial)' : ` (reply ${i})`}
                </span>
                {messages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMessage(i)}
                    className="text-xs text-destructive hover:opacity-80 transition-opacity"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">From</label>
                  <input
                    type="email"
                    value={msg.from}
                    onChange={(e) => handleMessageChange(i, 'from', e.target.value)}
                    placeholder="sender@example.com"
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">To</label>
                  <input
                    type="email"
                    value={msg.to}
                    onChange={(e) => handleMessageChange(i, 'to', e.target.value)}
                    placeholder="recipient@example.com"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Body</label>
                <textarea
                  value={msg.body}
                  onChange={(e) => handleMessageChange(i, 'body', e.target.value)}
                  placeholder="Message body…"
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addMessage}
            className="self-start text-sm text-muted-foreground border border-dashed border-border rounded-md px-3 py-1.5 hover:border-foreground hover:text-foreground transition-colors"
          >
            + Add message
          </button>
        </div>

        <button
          type="submit"
          disabled={loading || messages.length === 0}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? `Sending ${messages.length} messages…` : `Send Thread (${messages.length} messages)`}
        </button>
      </form>

      {status?.type === 'success' && (
        <div className="mt-6 flex flex-col gap-3">
          <p className="text-sm font-semibold text-green-700">
            Thread sent — {status.thread.length} messages delivered
          </p>
          {status.thread.map((msg, i) => (
            <div
              key={i}
              className="p-3 rounded-md border border-green-200 bg-green-50 text-green-800 text-xs space-y-1"
            >
              <p className="font-semibold">
                Message {i + 1}
                {i === 0 ? ' (initial)' : ` (reply ${i})`}
              </p>
              <p>
                <span className="font-medium">Message-ID:</span>{' '}
                <span className="font-mono break-all">{msg.messageId}</span>
              </p>
              <p>
                <span className="font-medium">From:</span> {msg.from} → <span className="font-medium">To:</span>{' '}
                {msg.to}
              </p>
              <p>
                <span className="font-medium">Body:</span> {msg.body}
              </p>
            </div>
          ))}
        </div>
      )}

      {status?.type === 'error' && (
        <div className="mt-6 p-4 rounded-md border border-red-200 bg-red-50 text-red-800 text-sm">
          <p className="font-semibold">Failed to send thread</p>
          <p className="mt-1 font-mono text-xs break-all">{status.message}</p>
        </div>
      )}
    </div>
  );
}
