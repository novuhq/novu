import { useId, useState } from 'react';
import Title from '@/components/Title';

type Status = { type: 'success'; messageId: string; accepted: string[] } | { type: 'error'; message: string } | null;

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors';

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

function readFileAsAttachmentPayload(
  file: File
): Promise<{ filename: string; contentBase64: string; contentType?: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(',');
      const contentBase64 = comma >= 0 ? result.slice(comma + 1) : result;

      resolve({
        filename: file.name,
        contentBase64,
        ...(file.type ? { contentType: file.type } : {}),
      });
    };

    reader.onerror = () => reject(new Error(reader.error?.message ?? 'Failed to read file'));

    reader.readAsDataURL(file);
  });
}

export default function SendEmailPage() {
  const formId = useId();
  const toId = `${formId}-to`;
  const fromId = `${formId}-from`;
  const subjectId = `${formId}-subject`;
  const bodyId = `${formId}-body`;
  const attachmentsId = `${formId}-attachments`;

  const [to, setTo] = useState('');
  const [from, setFrom] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      let totalBytes = 0;

      for (const file of attachmentFiles) {
        if (file.size > MAX_ATTACHMENT_BYTES) {
          setStatus({
            type: 'error',
            message: `Each attachment must be under ${MAX_ATTACHMENT_BYTES / (1024 * 1024)}MB.`,
          });
          setLoading(false);

          return;
        }

        totalBytes += file.size;

        if (totalBytes > MAX_ATTACHMENT_BYTES) {
          setStatus({
            type: 'error',
            message: `Combined attachments must be under ${MAX_ATTACHMENT_BYTES / (1024 * 1024)}MB.`,
          });
          setLoading(false);

          return;
        }
      }

      const attachments =
        attachmentFiles.length > 0 ? await Promise.all(attachmentFiles.map(readFileAsAttachmentPayload)) : undefined;

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, from, subject, body, attachments }),
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
        Optional files are attached to the message (up to 5MB per file and combined). Leave any field blank to fall back
        to the corresponding <code className="font-mono bg-muted px-1 rounded">SMTP_*</code> env var.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor={toId} className="text-sm font-medium text-foreground">
            To
          </label>
          <input
            id={toId}
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com  (default: SMTP_TO)"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={fromId} className="text-sm font-medium text-foreground">
            From
          </label>
          <input
            id={fromId}
            type="email"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="sender@example.com  (default: SMTP_FROM)"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={subjectId} className="text-sm font-medium text-foreground">
            Subject
          </label>
          <input
            id={subjectId}
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Test email from Novu playground"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={bodyId} className="text-sm font-medium text-foreground">
            Body
          </label>
          <textarea
            id={bodyId}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="This is a test email sent from the Novu Next.js playground."
            rows={4}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={attachmentsId} className="text-sm font-medium text-foreground">
            Attachments
          </label>
          <input
            id={attachmentsId}
            type="file"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              setAttachmentFiles((prev) => [...prev, ...files]);
              e.target.value = '';
            }}
            className="text-sm text-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />
          {attachmentFiles.length > 0 && (
            <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
              {attachmentFiles.map((file, index) => (
                <li
                  key={`${file.name}-${file.lastModified}-${index}`}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate" title={file.name}>
                    {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttachmentFiles((prev) => prev.filter((_, i) => i !== index))}
                    className="shrink-0 text-foreground underline-offset-2 hover:underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
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
