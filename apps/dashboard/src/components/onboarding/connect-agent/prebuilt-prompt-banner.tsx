import { useState } from 'react';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';

/**
 * Starter prompt surfaced in the onboarding banner. Mirrors the demo support-agent the user can
 * spin up from the "What should your agent do?" step, so copying it (or opening it in Cursor)
 * gets them to a working agent description without typing anything.
 */
const PREBUILT_AGENT_PROMPT = `Add an agent to my app following instructions from this markdown file: https://github.com/novuhq/novu/blob/main/packages/shared/docs/agent-onboarding.md`;

function safeCursorEncode(text: string): string {
  return encodeURIComponent(text).replace(/[!'()*~]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

const CURSOR_DEEP_LINK = `https://cursor.com/link/prompt?text=${safeCursorEncode(PREBUILT_AGENT_PROMPT)}`;

/**
 * Inline tip rendered above the agent-brain steps during onboarding: a pre-built agent prompt the
 * user can copy to their clipboard or open directly in Cursor via the prompt deep link.
 */
export function PrebuiltPromptBanner() {
  const telemetry = useTelemetry();
  const [copied, setCopied] = useState(false);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(PREBUILT_AGENT_PROMPT);
      setCopied(true);
      telemetry(TelemetryEvent.AI_PROMPT_COPIED, { source: 'agents-onboarding' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access denied — nothing actionable for the user beyond retrying.
    }
  };

  return (
    <div className="border-stroke-weak bg-bg-weak rounded-lg border p-1">
      <div className="bg-bg-white flex items-center gap-2 rounded-md border border-[rgba(255,132,71,0.1)] py-1.5 pl-2 pr-1.5">
        <div className="bg-text-soft h-7 w-1 shrink-0 self-stretch rounded-full" />
        <p className="text-text-strong text-label-sm min-w-0 flex-1 font-normal">
          Use this pre-built prompt to get started faster.
        </p>
        <div className="flex shrink-0 items-center gap-2.5">
          <a
            href={CURSOR_DEEP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              telemetry(TelemetryEvent.AI_PROMPT_COPIED, { source: 'agents-onboarding', method: 'cursor-deeplink' })
            }
            className="text-text-sub inline-flex h-7 cursor-pointer items-center gap-1 rounded-md p-1.5 text-xs font-medium shadow-[0px_1px_3px_0px_rgba(14,18,27,0.12),0px_0px_0px_1px_#e1e4ea] transition-colors hover:bg-neutral-50"
            style={{
              backgroundImage:
                'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.02) 100%), linear-gradient(90deg, #fff 0%, #fff 100%)',
            }}
          >
            <img src="/images/cursor-icon.svg" alt="" className="size-4" />
            <span className="px-1">Open in Cursor</span>
          </a>
          <button
            type="button"
            onClick={handleCopyPrompt}
            className="text-static-white inline-flex h-7 cursor-pointer items-center rounded-md py-1.5 pl-2 pr-1.5 text-xs font-medium shadow-[0px_1px_2px_0px_rgba(27,28,29,0.48),0px_0px_0px_1px_#242628] transition-[background] duration-150"
            style={{
              backgroundImage: copied
                ? 'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.12) 100%), linear-gradient(90deg, #151a22 0%, #151a22 100%)'
                : 'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 100%), linear-gradient(90deg, #0e121b 0%, #0e121b 100%)',
            }}
          >
            <span className="px-1">{copied ? 'Copied!' : 'Copy prompt'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
