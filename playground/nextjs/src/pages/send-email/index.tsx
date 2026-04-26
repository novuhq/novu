import { useState } from 'react';
import Title from '@/components/Title';

type Status = { type: 'success'; messageId: string; accepted: string[] } | { type: 'error'; message: string } | null;

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors';

export default function SendEmailPage() {
  const [to, setTo] = useState('');
  const [from, setFrom] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, from, subject, body }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus({ type: 'error', message: data.error ?? 'Unknown error' });
      } else {
        setStatus({ type: 'success', messageId: data.messageId, accepted: data.accepted });
      }
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-lg">
      <Title title="Send Test Email" />
      <p className="text-sm text-muted-foreground mb-6 mt-1">
        Sends an email via the SMTP server configured in <code className="font-mono bg-muted px-1 rounded">.env</code>.
        Leave any field blank to fall back to the corresponding{' '}
        <code className="font-mono bg-muted px-1 rounded">SMTP_*</code> env var.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground">To</label>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com  (default: SMTP_TO)"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground">From</label>
          <input
            type="email"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="sender@example.com  (default: SMTP_FROM)"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Test email from Novu playground"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="This is a test email sent from the Novu Next.js playground."
            rows={4}
            className={`${inputClass} resize-none`}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending…' : 'Send Email'}
        </button>
      </form>

      {status?.type === 'success' && (
        <div className="mt-5 p-4 rounded-md border border-green-200 bg-green-50 text-green-800 text-sm space-y-1">
          <p className="font-semibold">Email sent successfully</p>
          <p>
            <span className="font-medium">Message ID:</span> {status.messageId}
          </p>
          <p>
            <span className="font-medium">Accepted:</span> {status.accepted.join(', ')}
          </p>
        </div>
      )}

      {status?.type === 'error' && (
        <div className="mt-5 p-4 rounded-md border border-red-200 bg-red-50 text-red-800 text-sm">
          <p className="font-semibold">Failed to send email</p>
          <p className="mt-1 font-mono text-xs break-all">{status.message}</p>
        </div>
      )}
    </div>
  );
}
