'use client';

import type { SocketStatus } from '../lib/socket-status';
import { SparkIcon } from './icons';

const CONNECTION_LABEL: Record<SocketStatus, string> = {
  connecting: 'Connecting',
  online: 'Connected',
  offline: 'Offline',
};

export function AppHeader({ state }: { state: SocketStatus }) {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="brand-mark">
          <SparkIcon size={18} />
        </div>
        <div className="brand-copy">
          <h1>Agent Chat</h1>
          <p>
            Headless <code>useAgentChat</code> playground · <code>@novu/react</code>
          </p>
        </div>
        <div className="app-header-spacer" />
        <span className="conn-pill" data-state={state}>
          <span className="conn-dot" aria-hidden />
          {CONNECTION_LABEL[state]}
        </span>
      </div>
    </header>
  );
}
