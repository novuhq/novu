'use client';

import { useState } from 'react';

type SimEvent = 'onMessage' | 'onAction' | 'onReaction';

interface SimResult {
  status: number;
  routedTo: string;
  replies: Array<{ url: string; payload: unknown }>;
}

export default function NovuAgentPlayground() {
  const [text, setText] = useState('hello there');
  const [platform, setPlatform] = useState('slack');
  const [event, setEvent] = useState<SimEvent>('onMessage');
  const [ongoing, setOngoing] = useState(true);
  const [isDM, setIsDM] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(overrides?: { text?: string; event?: SimEvent }) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/novu-agent/simulate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text: overrides?.text ?? text,
          platform,
          event: overrides?.event ?? event,
          ongoing,
          isDM,
        }),
      });
      const data = (await res.json()) as SimResult;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  function hasCardReply(replies: SimResult['replies']): boolean {
    return replies.some((r) => {
      const payload = r.payload as { reply?: { card?: unknown } } | null;

      return Boolean(payload?.reply?.card);
    });
  }

  return (
    <main style={{ maxWidth: 760, margin: '40px auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Novu Chat-adapter playground</h1>
      <p style={{ color: '#555', marginTop: 8 }}>
        Craft a signed <code>AgentBridgeRequest</code> and run it through the real <code>@novu/chat-sdk-adapter</code> adapter
        locally. Reply POSTs are captured instead of sent to Novu — no credentials needed.
      </p>
      <p style={{ color: '#555', marginTop: 4 }}>
        Tip: send the message <code>card</code> (or click <em>Send a card reply</em>) to have the agent post a
        chat-sdk <code>Card</code>; <code>whoami</code> echoes the resolved subscriber.
      </p>

      <div style={{ display: 'grid', gap: 12, marginTop: 24 }}>
        <label style={labelStyle}>
          Message text
          <input value={text} onChange={(e) => setText(e.target.value)} style={inputStyle} />
        </label>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <label style={labelStyle}>
            Platform
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={inputStyle}>
              {['slack', 'whatsapp', 'msteams', 'telegram', 'email'].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            Event
            <select value={event} onChange={(e) => setEvent(e.target.value as SimEvent)} style={inputStyle}>
              {(['onMessage', 'onAction', 'onReaction'] as SimEvent[]).map((ev) => (
                <option key={ev} value={ev}>
                  {ev}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 20 }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={ongoing} onChange={(e) => setOngoing(e.target.checked)} />
            Ongoing conversation (subscribed)
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={isDM} onChange={(e) => setIsDM(e.target.checked)} />
            Direct message
          </label>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => run()} disabled={loading} style={primaryButtonStyle}>
            {loading ? 'Running…' : 'Send simulated bridge request'}
          </button>
          <button
            type="button"
            onClick={() => run({ text: 'card', event: 'onMessage' })}
            disabled={loading}
            style={secondaryButtonStyle}
            title="Posts a chat-sdk Card via thread.post(Card(...)) and shows the normalized reply payload"
          >
            🎴 Send a card reply
          </button>
        </div>
      </div>

      {error && <pre style={{ ...preStyle, color: '#b00' }}>{error}</pre>}

      {result && (
        <div style={{ marginTop: 24 }}>
          <p>
            <strong>HTTP status:</strong> {result.status} &nbsp;·&nbsp; <strong>Routed to:</strong>{' '}
            <code>{result.routedTo}</code>
          </p>
          {hasCardReply(result.replies) && (
            <p
              style={{
                marginTop: 12,
                padding: '8px 12px',
                background: '#e8f7ee',
                border: '1px solid #b7e4c7',
                borderRadius: 8,
                color: '#1b6b3a',
                fontWeight: 600,
                width: 'fit-content',
              }}
            >
              ✅ Card reply captured — the adapter normalized the chat-sdk Card into <code>reply.card</code>.
            </p>
          )}
          <p style={{ marginTop: 12, fontWeight: 600 }}>Captured replies ({result.replies.length}):</p>
          <pre style={preStyle}>{JSON.stringify(result.replies, null, 2)}</pre>
        </div>
      )}

      <hr style={{ margin: '32px 0', border: 0, borderTop: '1px solid #eee' }} />
      <p style={{ color: '#777', fontSize: 14 }}>
        Live bridge endpoint: <code>POST /api/novu-agent</code>. Set <code>NOVU_SECRET_KEY</code> and{' '}
        <code>NOVU_AGENT_IDENTIFIER</code>, then point your Novu agent&apos;s bridge URL at it to test real channels.
      </p>
    </main>
  );
}

const primaryButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  background: '#000',
  color: '#fff',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  width: 'fit-content',
};
const secondaryButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  background: '#fff',
  color: '#000',
  borderRadius: 8,
  border: '1px solid #000',
  cursor: 'pointer',
  width: 'fit-content',
};
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 600 };
const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid #ccc',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 400,
};
const preStyle: React.CSSProperties = {
  marginTop: 8,
  padding: 12,
  background: '#f6f6f6',
  borderRadius: 8,
  overflowX: 'auto',
  fontSize: 13,
};
