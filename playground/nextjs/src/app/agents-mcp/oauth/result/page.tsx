'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

type Status = 'connected' | 'error' | 'unknown';

export default function OAuthResultPage() {
  return (
    <Suspense fallback={<ResultLayout title="Finalizing OAuth…" />}>
      <ResultBody />
    </Suspense>
  );
}

function ResultBody() {
  const searchParams = useSearchParams();
  const status: Status = (() => {
    const raw = searchParams?.get('status');
    if (raw === 'connected' || raw === 'error') return raw;

    return 'unknown';
  })();
  const reason = searchParams?.get('reason') ?? undefined;

  const [counter, setCounter] = useState<number | null>(null);

  useEffect(() => {
    if (status === 'unknown') return;

    try {
      window.opener?.postMessage({ type: 'novu-mcp-oauth-result', status, reason }, window.location.origin);
    } catch {
      // postMessage may fail if there's no opener — fine.
    }

    setCounter(2);
  }, [status, reason]);

  useEffect(() => {
    if (counter === null) return;
    if (counter <= 0) {
      window.close();

      return;
    }

    const t = setTimeout(() => setCounter((c) => (c === null ? null : c - 1)), 1000);

    return () => clearTimeout(t);
  }, [counter]);

  return (
    <ResultLayout
      icon={
        status === 'connected' ? (
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
        ) : status === 'error' ? (
          <XCircle className="mx-auto h-10 w-10 text-destructive" />
        ) : null
      }
      title={
        status === 'connected'
          ? 'MCP connection complete'
          : status === 'error'
            ? 'MCP connection failed'
            : 'Unknown OAuth result'
      }
      detail={reason}
      footer={
        counter !== null
          ? `This window will close in ${counter}s. You can also close it manually.`
          : 'You can close this window.'
      }
    />
  );
}

function ResultLayout({
  title,
  detail,
  icon,
  footer,
}: {
  title: string;
  detail?: string;
  icon?: React.ReactNode;
  footer?: string;
}) {
  return (
    <main className="flex h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center space-y-3">
        {icon}
        <h1 className="text-lg font-semibold">{title}</h1>
        {detail ? <p className="text-sm text-muted-foreground">{detail}</p> : null}
        {footer ? <p className="text-xs text-muted-foreground">{footer}</p> : null}
        <button
          type="button"
          className="text-xs underline text-muted-foreground hover:text-foreground"
          onClick={() => window.close()}
        >
          Close now
        </button>
      </div>
    </main>
  );
}
