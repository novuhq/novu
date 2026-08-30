'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { SendIcon } from './icons';

type ComposerProps = {
  pending: boolean;
  isRunning: boolean;
  onSend: (text: string) => void;
};

export function Composer({ pending, isRunning, onSend }: ComposerProps) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!pending) {
      inputRef.current?.focus();
    }
  }, [pending]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || pending) return;
    setDraft('');
    onSend(text);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <form className="composer" onSubmit={submit}>
      <div className="composer-box">
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Message the agent…"
          disabled={pending}
          rows={1}
          autoComplete="off"
          aria-label="Message"
        />
        <button
          type="submit"
          className="composer-send"
          disabled={pending || !draft.trim()}
          aria-label={pending ? (isRunning ? 'Agent running' : 'Sending') : 'Send message'}
        >
          {pending ? <span className="spinner" aria-hidden /> : <SendIcon />}
        </button>
      </div>
      <div className="composer-hints">
        <span>
          <kbd>Enter</kbd> to send · <kbd>Shift</kbd>+<kbd>Enter</kbd> for newline
        </span>
        {isRunning ? <span>Agent is responding…</span> : null}
      </div>
    </form>
  );
}
