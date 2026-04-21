import { useEffect, useState } from 'react';
import { RiCloseLine, RiSparklingLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';

const DISMISSED_KEY = 'chat-rich-body-upgrade-banner-dismissed';

/**
 * Shown once, the first time an existing body-only chat step is opened in
 * the new rich editor. Lets the author know their text was promoted into a
 * Text block and points them at the slash menu for richer content.
 *
 * Stored in localStorage so we don't pester customers step after step —
 * the hint is only useful for the first introduction.
 */
export function UpgradeBanner() {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;

    return window.localStorage.getItem(DISMISSED_KEY) === 'true';
  });

  useEffect(() => {
    if (dismissed && typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISSED_KEY, 'true');
    }
  }, [dismissed]);

  if (dismissed) return null;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-primary-100 bg-primary-alpha-10 p-3 text-xs text-primary-darker">
      <RiSparklingLine className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1">
        <div className="font-medium">Now supports rich layouts.</div>
        <div className="text-foreground-600">
          Your existing message was upgraded into a text block. Use <span className="font-medium">Add block</span> to
          insert headings, buttons, links, or fields — they compile to Slack Block Kit, Teams Adaptive Cards, and
          Discord embeds on send.
        </div>
      </div>
      <Button size="2xs" variant="secondary" mode="ghost" type="button" onClick={() => setDismissed(true)}>
        <RiCloseLine className="size-3" />
      </Button>
    </div>
  );
}
