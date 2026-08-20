import { buildOnboardingAgentPrompt } from '@novu/shared';
import { useMemo, useState } from 'react';
import { useTelemetry } from '@/hooks/use-telemetry';
import { apiHostnameManager } from '@/utils/api-hostname-manager';
import { TelemetryEvent } from '@/utils/telemetry';

function getDefaultOnboardingPrompt(): string {
  return buildOnboardingAgentPrompt(apiHostnameManager.getHostname());
}

function safeCursorEncode(text: string): string {
  return encodeURIComponent(text).replace(/[!'()*~]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

type PrebuiltPromptBannerProps = {
  /** Prompt copied to the clipboard / opened in Cursor. Defaults to the onboarding agent prompt. */
  prompt?: string;
  /** Optional CLI snippet copied as the TUI alternative to the agent prompt. */
  command?: string;
  /** Telemetry source tag for the copy / Cursor deep-link events. */
  source?: string;
  /** Inline tip headline. */
  message?: string;
  /** `actions` renders only the Cursor / copy buttons, matching the setup-guide Figma. */
  layout?: 'banner' | 'actions';
};

const outlineActionClass = {
  compact:
    'text-text-sub inline-flex h-6 cursor-pointer items-center gap-1 rounded-md px-1 text-xs font-medium shadow-[0px_1px_3px_0px_rgba(14,18,27,0.12),0px_0px_0px_1px_#e1e4ea] transition-colors hover:bg-neutral-50',
  default:
    'text-text-sub inline-flex h-7 cursor-pointer items-center gap-1 rounded-md p-1.5 text-xs font-medium shadow-[0px_1px_3px_0px_rgba(14,18,27,0.12),0px_0px_0px_1px_#e1e4ea] transition-colors hover:bg-neutral-50',
} as const;

const outlineActionStyle = {
  backgroundImage:
    'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.02) 100%), linear-gradient(90deg, #fff 0%, #fff 100%)',
} as const;

/**
 * Inline tip rendered above the agent-brain steps during onboarding: a pre-built agent prompt the
 * user can copy to their clipboard or open directly in Cursor via the prompt deep link.
 */
export function CursorPromptActions({
  prompt = getDefaultOnboardingPrompt(),
  command,
  source = 'agents-onboarding',
  compact = false,
}: Pick<PrebuiltPromptBannerProps, 'prompt' | 'command' | 'source'> & { compact?: boolean } = {}) {
  const telemetry = useTelemetry();
  const [copied, setCopied] = useState<'prompt' | 'command' | null>(null);

  const cursorDeepLink = useMemo(() => `https://cursor.com/link/prompt?text=${safeCursorEncode(prompt)}`, [prompt]);
  const outlineClass = compact ? outlineActionClass.compact : outlineActionClass.default;

  const copyText = async (text: string, kind: 'prompt' | 'command', extra?: Record<string, string>) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      telemetry(TelemetryEvent.AI_PROMPT_COPIED, { source, ...extra });
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard access denied — nothing actionable for the user beyond retrying.
    }
  };

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <a
        href={cursorDeepLink}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => telemetry(TelemetryEvent.AI_PROMPT_COPIED, { source, method: 'cursor-deeplink' })}
        className={outlineClass}
        style={outlineActionStyle}
      >
        <img src="/images/cursor-icon.svg" alt="" className="size-4" />
        <span className="px-1">Open in Cursor</span>
      </a>
      <button
        type="button"
        onClick={() => void copyText(prompt, 'prompt')}
        className={
          compact
            ? 'text-static-white inline-flex h-6 cursor-pointer items-center rounded-md py-1 pl-2 pr-1.5 text-xs font-medium shadow-[0px_1px_2px_0px_rgba(27,28,29,0.48),0px_0px_0px_1px_#242628] transition-[background] duration-150'
            : 'text-static-white inline-flex h-7 cursor-pointer items-center rounded-md py-1.5 pl-2 pr-1.5 text-xs font-medium shadow-[0px_1px_2px_0px_rgba(27,28,29,0.48),0px_0px_0px_1px_#242628] transition-[background] duration-150'
        }
        style={{
          backgroundImage:
            copied === 'prompt'
              ? 'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.12) 100%), linear-gradient(90deg, #151a22 0%, #151a22 100%)'
              : 'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 100%), linear-gradient(90deg, #0e121b 0%, #0e121b 100%)',
        }}
      >
        <span className="whitespace-nowrap px-1">
          {copied === 'prompt' ? 'Copied - paste in your agent' : 'Copy prompt'}
        </span>
      </button>
      {command ? (
        <button
          type="button"
          onClick={() => void copyText(command, 'command', { method: 'cli-command' })}
          className={outlineClass}
          style={outlineActionStyle}
        >
          <span className="whitespace-nowrap px-1">
            {copied === 'command' ? 'Copied - paste in your terminal' : 'Copy command'}
          </span>
        </button>
      ) : null}
    </div>
  );
}

export function PrebuiltPromptBanner({
  prompt = getDefaultOnboardingPrompt(),
  command,
  source = 'agents-onboarding',
  message = 'Use this pre-built prompt to get started faster.',
  layout = 'banner',
}: PrebuiltPromptBannerProps = {}) {
  if (layout === 'actions') {
    return <CursorPromptActions prompt={prompt} command={command} source={source} />;
  }

  return (
    <div className="border-stroke-weak bg-bg-weak rounded-lg border p-1">
      <div className="bg-bg-white flex items-center gap-2 rounded-md border border-[rgba(255,132,71,0.1)] py-1.5 pl-2 pr-1.5">
        <div className="bg-text-soft h-7 w-1 shrink-0 self-stretch rounded-full" />
        <p className="text-text-strong text-label-sm min-w-0 flex-1 font-normal">{message}</p>
        <CursorPromptActions prompt={prompt} command={command} source={source} />
      </div>
    </div>
  );
}
