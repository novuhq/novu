import { Inbox } from '@novu/react';
import './app.css';

const backendUrl = import.meta.env.VITE_NOVU_BACKEND_URL;
const socketUrl = import.meta.env.VITE_NOVU_SOCKET_URL;

export function App() {
  const hasLocalBackend = Boolean(backendUrl);

  return (
    <main className="page">
      <header className="header">
        <h1>Novu Inbox — keyless mode</h1>
        <p>
          Renders <code>&lt;Inbox /&gt;</code> with no <code>applicationIdentifier</code> or{' '}
          <code>subscriber</code>. The API provisions a temporary demo environment (expires in ~24h).
        </p>
        <p className="hint">
          {hasLocalBackend ? (
            <>
              Using local API at <code>{backendUrl}</code>
              {socketUrl ? (
                <>
                  {' '}
                  and WebSocket at <code>{socketUrl}</code>
                </>
              ) : null}
              . Ensure API, worker, and WS services are running.
            </>
          ) : (
            <>
              Using Novu cloud (<code>api.novu.co</code>). Copy <code>.env.example</code> to{' '}
              <code>.env</code> to point at a local monorepo stack instead.
            </>
          )}
        </p>
      </header>

      <section className="inbox-panel" aria-label="Novu Inbox">
        <Inbox
          {...(backendUrl ? { backendUrl, ...(socketUrl ? { socketUrl } : {}) } : {})}
        />
      </section>
    </main>
  );
}
