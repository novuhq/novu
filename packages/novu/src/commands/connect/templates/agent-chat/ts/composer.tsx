'use client';

import type { UseAgentChatResult } from '@novu/react';
import { FormEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SendIcon } from './icons';

type ComposerProps = {
  isLoading: boolean;
  isRunning: boolean;
  onSend: UseAgentChatResult['sendMessage'];
};

const MAX_HEIGHT_PX = 128;

export function Composer({ isLoading, isRunning, onSend }: ComposerProps) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const disabled = isLoading || isRunning;

  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    input.style.height = '0px';
    input.style.height = `${Math.min(input.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [draft]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || disabled) return;
    setDraft('');
    void onSend(text);
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
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Message your agent…"
          disabled={isLoading}
          rows={1}
          autoComplete="off"
          aria-label="Message your agent"
        />
        <div className="composer-toolbar">
          <button
            type="submit"
            className="composer-send"
            disabled={disabled || !draft.trim()}
            aria-label={isRunning ? 'Agent is responding' : 'Send message'}
          >
            {isRunning ? <span className="spinner" aria-hidden /> : <SendIcon />}
          </button>
        </div>
      </div>
    </form>
  );
}
