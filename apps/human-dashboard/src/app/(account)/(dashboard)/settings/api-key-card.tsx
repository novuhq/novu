'use client';

import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useState, useTransition } from 'react';

import { Button, SMALL_BUTTON } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { CopyField } from '@/components/ui/copy-field';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

import { DialogMark } from '../contacts/dialog-mark';
import { regenerateApiKeyAction } from './actions';
import { CardHeading, SettingsCard } from './settings-card';

/** The variable the `human` CLI reads the key from. */
const KEY_VARIABLE = 'NOVU_SECRET_KEY';

const MASK = '•'.repeat(24);
const SHOWN_CHARACTERS = 4;

/** The dialog grows from the question to the wider one that shows the key, along with its height. */
const DIALOG_SIZE = 'transition-[height,max-width]';

/** The Settings dialogs keep 10px between the mark, the title and the description. */
export const DIALOG_HEADER = 'gap-2.5';

type ApiKeyCardProps = {
  /** `null` when the key couldn't be read just now. */
  apiKey: string | null;
};

/** The operator's API key: hidden until asked for, with the line that hands it to the CLI on another machine. */
export function ApiKeyCard({ apiKey: loadedKey }: ApiKeyCardProps) {
  // A key made here is shown right away, before the page has read it again.
  const [regeneratedKey, setRegeneratedKey] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  // Only a key that was toggled fades in; the first one is simply there.
  const [toggled, setToggled] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [opening, setOpening] = useState(0);

  const apiKey = regeneratedKey ?? loadedKey;

  function openDialog() {
    setOpening((count) => count + 1);
    setDialogOpen(true);
  }

  function toggleRevealed() {
    setToggled(true);
    setRevealed((shown) => !shown);
  }

  function showNewKey(newKey: string) {
    setRegeneratedKey(newKey);
    setRevealed(false);
  }

  return (
    <SettingsCard className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <CardHeading
          title="API key"
          description="Only for CI, cloud VMs and automations. On your own machine the CLI saves it for you."
        />
        <Button variant="secondary" className={SMALL_BUTTON} onClick={openDialog}>
          <RefreshCw aria-hidden="true" className="size-3.5" />
          Regenerate
        </Button>
      </div>
      {apiKey ? (
        <>
          <div className="flex gap-2">
            <div className="flex h-8 min-w-0 flex-1 items-center gap-1 rounded bg-background pr-[5px] pl-2.5 ring-1 ring-border ring-inset">
              <code
                key={String(revealed)}
                className={cn(
                  'min-w-0 flex-1 truncate font-mono text-[13px] leading-5 text-foreground',
                  toggled && 'animate-overlay-in motion-reduce:animate-none'
                )}
              >
                {revealed ? apiKey : maskKey(apiKey)}
              </code>
              <button
                type="button"
                onClick={toggleRevealed}
                aria-pressed={revealed}
                aria-label="Show API key"
                title={revealed ? 'Hide API key' : 'Show API key'}
                className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted transition-colors duration-150 hover:text-foreground focus-visible:outline-offset-0 motion-reduce:transition-none"
              >
                <RevealIcon revealed={revealed} />
              </button>
            </div>
            <CopyButton value={apiKey} label="Copy API key">
              Copy
            </CopyButton>
          </div>
          <CopyField
            command
            value={`export ${KEY_VARIABLE}=${apiKey}`}
            display={
              <span key={String(revealed)} className={cn(toggled && 'animate-overlay-in motion-reduce:animate-none')}>
                export {KEY_VARIABLE}={revealed ? apiKey : `…${apiKey.slice(-SHOWN_CHARACTERS)}`}
              </span>
            }
            label="Copy export command"
          />
        </>
      ) : (
        <p role="alert" className="text-xs leading-4 text-danger">
          We couldn&apos;t load your API key right now. Please refresh the page.
        </p>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {/* A new key per opening starts at the question, and keeps what was shown in place while it closes. */}
        <RegenerateDialogContent key={opening} onRegenerated={showNewKey} />
      </Dialog>
    </SettingsCard>
  );
}

/** All but the end of the key as dots, so the operator can still tell two keys apart. */
function maskKey(apiKey: string): string {
  return `${MASK}${apiKey.slice(-SHOWN_CHARACTERS)}`;
}

/** The eye, crossed out while the key is shown. One fades into the other. */
function RevealIcon({ revealed }: { revealed: boolean }) {
  const layer =
    'col-start-1 row-start-1 size-3.5 transition-[opacity,scale] duration-200 ease-out motion-reduce:transition-none';

  return (
    <span aria-hidden="true" className="inline-grid">
      <Eye className={cn(layer, revealed && 'scale-50 opacity-0')} />
      <EyeOff className={cn(layer, !revealed && 'scale-50 opacity-0')} />
    </span>
  );
}

/** Asks before replacing the key, then swaps to the new key so it can be copied on the spot. */
function RegenerateDialogContent({ onRegenerated }: { onRegenerated: (apiKey: string) => void }) {
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRegenerate() {
    setError(null);
    startTransition(async () => {
      const result = await regenerateApiKeyAction();

      if (!result.ok) {
        setError(result.error);

        return;
      }

      setNewKey(result.apiKey);
      onRegenerated(result.apiKey);
    });
  }

  if (newKey) {
    return (
      <DialogContent
        className={cn(DIALOG_SIZE, 'max-w-130')}
        headerClassName={DIALOG_HEADER}
        icon={<DialogMark glyph="check" />}
        title="Copy your new key"
        description="Paste it wherever the old one was."
        footer={
          <DialogClose asChild>
            <Button variant="secondary">I&apos;ve copied it</Button>
          </DialogClose>
        }
      >
        <div className="flex items-center gap-2.5 rounded-md border border-border bg-background px-3 py-2.5">
          <code className="min-w-0 flex-1 truncate font-mono text-[13px] leading-5 text-foreground">{newKey}</code>
          <CopyButton value={newKey} label="Copy API key" variant="primary" className="h-7 px-2.5">
            Copy
          </CopyButton>
        </div>
      </DialogContent>
    );
  }

  return (
    <DialogContent
      className={cn(DIALOG_SIZE, 'max-w-115')}
      headerClassName={DIALOG_HEADER}
      icon={<DialogMark glyph="key" />}
      title="Regenerate the API key?"
      locked={pending}
      description={
        <>
          CI, VMs and automations using the current key stop working until you paste the new one. On your own machine,
          run <span className="font-mono text-default">human login</span> again.
        </>
      }
      footer={
        <>
          <DialogClose asChild>
            <Button variant="secondary" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button variant="danger" pending={pending} onClick={handleRegenerate}>
            Regenerate
          </Button>
        </>
      }
    >
      {error && (
        <p role="alert" className="text-xs leading-4 text-danger">
          {error}
        </p>
      )}
    </DialogContent>
  );
}
