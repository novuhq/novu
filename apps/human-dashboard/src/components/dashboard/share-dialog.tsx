'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Copy, Download, FileText, LoaderCircle, X } from 'lucide-react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

import { SHARE_IMAGE_PATH } from '@/components/dashboard/nav';
import { Button, buttonClassName, SMALL_BUTTON } from '@/components/ui/button';
import { COPIED_MS, CopiedIcon } from '@/components/ui/copy-button';
import { Dialog, DialogPanel } from '@/components/ui/dialog';
import { Fold } from '@/components/ui/stepper';
import { toast } from '@/components/ui/toast';
import type { AgentReach } from '@/lib/agent-settings';
import { writtenLink } from '@/lib/onboarding';
import { cn } from '@/lib/utils';

/** What was just copied: the button that copied it shows its check mark for a moment. */
type Copied = 'link' | 'signature';

/** Where the share image is loaded from: the signed-in operator's own card, unless a preview provides a stand-in. */
export const ShareImageUrlContext = createContext(SHARE_IMAGE_PATH);

type ShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** How the agent is called in a sentence: "Share atlas". */
  handle: string;
  /** The public card's link, `https://agentinbox.md/p/atlas` (`cardLinkOf`). Shown as `writtenLink` writes it. */
  cardLink: string;
  /** Who can reach the agent. With `contacts` the link shows no card, and the sheet says so. `null` when unknown. */
  reach: AgentReach | null;
  /** Opened from a dashboard page: centred on the page beside the 248px sidebar, as the design draws it. */
  besideSidebar?: boolean;
};

/**
 * "Share atlas’s card" (`4 · Share atlas’s card`): the image people see where the card is shared, the link
 * with Copy link, and the other ways to pass it on: Post on X, Download image and Email signature.
 *
 * The image comes from one request per opening. The preview shows it and Download saves the very same
 * bytes, so the two never differ.
 */
export function ShareDialog({ open, onOpenChange, besideSidebar = false, ...sheet }: ShareDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPanel
        overlayClassName="bg-black/55"
        className={cn(
          'max-w-115 rounded-[14px] border border-border-strong bg-background shadow-[0_24px_60px_0_rgb(0_0_0/0.55)]',
          besideSidebar && 'md:left-[calc(50%+7.75rem)]'
        )}
      >
        {/* Mounted only while the dialog shows: each opening asks for the image again. */}
        <ShareSheet {...sheet} />
      </DialogPanel>
    </Dialog>
  );
}

type ShareSheetProps = Omit<ShareDialogProps, 'open' | 'onOpenChange' | 'besideSidebar'>;

function ShareSheet({ handle, cardLink, reach }: ShareSheetProps) {
  const image = useShareImage(useContext(ShareImageUrlContext));
  const [copied, showCopied] = useCopied();
  const [downloading, setDownloading] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(cardLink);
    } catch {
      toast("Couldn't copy. Select the link and copy it yourself.", 'error');

      return;
    }

    showCopied('link');
  }

  async function copySignature() {
    try {
      await writeRichText(emailSignature(handle, cardLink));
    } catch {
      toast("Couldn't copy the signature. Try again.", 'error');

      return;
    }

    showCopied('signature');
  }

  async function download() {
    if (downloading) {
      return;
    }

    setDownloading(true);

    try {
      saveFile(await image.read(), `${handle}-card.png`);
    } catch (error) {
      console.error('Failed to download the share image', error);
      toast("Couldn't download the image. Try again.", 'error');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <SharePreview image={image.state} handle={handle} />

      <div className="flex flex-col gap-3.5 px-5 pt-4.5 pb-5">
        <div className="flex h-5.5 items-center gap-2">
          <DialogPrimitive.Title className="min-w-0 flex-1 truncate text-base leading-5.5 font-medium text-foreground">
            Share {handle}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close
            aria-label="Close"
            className="-m-1 shrink-0 cursor-pointer rounded p-1 text-secondary transition-colors duration-150 hover:text-foreground motion-reduce:transition-none"
          >
            <X aria-hidden="true" className="size-3.5" />
          </DialogPrimitive.Close>
        </div>

        <DialogPrimitive.Description className="text-[13px] leading-4.75 text-secondary">
          One link with every way to reach {handle}.
        </DialogPrimitive.Description>

        <div className="flex h-12 items-center gap-2 rounded-lg border border-border-strong bg-subtle py-2.25 pr-2.5 pl-3">
          <p className="min-w-0 flex-1 truncate font-mono text-[13px] leading-4.5 text-foreground">
            {writtenLink(cardLink)}
          </p>
          <Button className={SMALL_BUTTON} onClick={copyLink}>
            <CopiedIcon icon={Copy} copied={copied === 'link'} className="size-3.5" />
            Copy link
          </Button>
        </div>

        {/* Not in the design: a card only its contacts can reach isn't shown to anyone else. Folded, it gives back its gap. */}
        <Fold open={reach === 'contacts'} closedClassName="-mt-3.5">
          <p className="text-xs leading-4 text-secondary">
            The link shows the card only while Who can reach {handle} is Anyone.
          </p>
        </Fold>

        <div className="flex flex-wrap gap-2">
          <a
            href={postOnXUrl(handle, cardLink)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClassName('secondary', SMALL_BUTTON)}
          >
            <XLogo />
            Post on X
          </a>
          <Button
            variant="secondary"
            aria-busy={downloading || undefined}
            className={cn(SMALL_BUTTON, downloading && 'cursor-progress')}
            onClick={download}
          >
            <PendingIcon pending={downloading} />
            Download image
          </Button>
          <Button variant="secondary" className={SMALL_BUTTON} onClick={copySignature}>
            <CopiedIcon icon={FileText} copied={copied === 'signature'} className="size-3.5" />
            Email signature
          </Button>
        </div>

        <span aria-live="polite" className="sr-only">
          {copied ? 'Copied' : ''}
        </span>
      </div>
    </>
  );
}

/** Whether the image has come, and once it has, its address in this page. */
type ShareImageState = { status: 'loading' } | { status: 'ready'; src: string } | { status: 'failed' };

/**
 * Loads the share image once, as a file. The preview shows it from memory and Download saves it from
 * there; when it couldn't be loaded, Download asks for it once more.
 */
function useShareImage(url: string) {
  const [state, setState] = useState<ShareImageState>({ status: 'loading' });
  const request = useRef<Promise<Blob> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let src: string | null = null;
    const blob = fetchImage(url, controller.signal);
    request.current = blob;

    blob.then(
      (file) => {
        src = URL.createObjectURL(file);
        setState({ status: 'ready', src });
      },
      (error) => {
        if (!controller.signal.aborted) {
          console.error('Failed to load the share image', error);
          setState({ status: 'failed' });
        }
      }
    );

    return () => {
      controller.abort();
      if (src) {
        URL.revokeObjectURL(src);
      }
    };
  }, [url]);

  /** The image the preview has, or is waiting for. A request that failed is made again. */
  function read(): Promise<Blob> {
    const pending = request.current ?? fetchImage(url);
    const retried = pending.catch(() => fetchImage(url));
    request.current = retried;

    return retried;
  }

  return { state, read };
}

async function fetchImage(url: string, signal?: AbortSignal): Promise<Blob> {
  const response = await fetch(url, { cache: 'no-store', signal });
  if (!response.ok) {
    throw new Error(`The share image answered ${response.status}`);
  }

  return response.blob();
}

/** The image as the design's preview draws it, with a quiet stand-in until it has come. */
function SharePreview({ image, handle }: { image: ShareImageState; handle: string }) {
  // The address that finished loading: the image fades in over its stand-in once it has.
  const [loaded, setLoaded] = useState<string>();
  const shown = image.status === 'ready' && loaded === image.src;
  const fade = 'transition-opacity duration-300 ease-out motion-reduce:transition-none';

  return (
    // The image is 1200 × 630: drawn at the sheet's width, the preview is 458 × 240.
    <div className="relative aspect-[1200/630] overflow-hidden bg-subtle">
      <PreviewStandIn className={cn(fade, shown && 'opacity-0')} pulsing={image.status === 'loading'} />
      {image.status === 'ready' && (
        <img
          src={image.src}
          alt={`${handle}’s card, as people see it where the link is shared`}
          ref={(element) => {
            if (element?.complete && element.naturalWidth > 0) {
              setLoaded(image.src);
            }
          }}
          onLoad={() => setLoaded(image.src)}
          className={cn('absolute inset-0 size-full', fade, !shown && 'opacity-0')}
        />
      )}
    </div>
  );
}

/** Where the image's name, lines and card will be, in the shapes of the dashboard's loading placeholders. */
function PreviewStandIn({ className, pulsing }: { className?: string; pulsing: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={cn('absolute inset-0', pulsing && 'animate-pulse motion-reduce:animate-none', className)}
    >
      <div className="absolute top-19 left-6 h-6.5 w-18 rounded bg-raised" />
      <div className="absolute top-28 left-6 h-5 w-25 rounded bg-raised" />
      <div className="absolute top-38.5 left-6 h-3 w-30 rounded bg-raised" />
      <div className="absolute top-43 left-6 h-3 w-34 rounded bg-raised" />
      <div className="absolute top-8 left-57.5 h-68 w-47 rotate-4 rounded-lg border border-border-strong bg-background" />
    </div>
  );
}

/** The download icon, which turns into a spinner while the image is on its way, and back. */
function PendingIcon({ pending }: { pending: boolean }) {
  const layer =
    'col-start-1 row-start-1 size-3.5 transition-[opacity,scale] duration-200 ease-out motion-reduce:transition-none';

  return (
    <span aria-hidden="true" className="inline-grid">
      <Download className={cn(layer, pending && 'scale-50 opacity-0')} />
      <LoaderCircle
        className={cn(layer, 'animate-spin motion-reduce:animate-none', !pending && 'scale-50 opacity-0')}
      />
    </span>
  );
}

/** The X logo (`Twitter-X` in the design), which the icon set doesn't have. */
function XLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3.5" fill="currentColor">
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  );
}

/** Which button copied last, for `COPIED_MS`: as long as a copy button shows its check mark. */
function useCopied(): [Copied | null, (what: Copied) => void] {
  const [copied, setCopied] = useState<{ what: Copied; at: number } | null>(null);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = setTimeout(() => setCopied(null), COPIED_MS);

    return () => clearTimeout(timer);
  }, [copied]);

  return [copied?.what ?? null, (what) => setCopied({ what, at: Date.now() })];
}

/** A new post on X with the card's link and one line about it. Not in the design: the line is the sheet's own. */
function postOnXUrl(handle: string, cardUrl: string): string {
  return `https://x.com/intent/post?${new URLSearchParams({ text: `One link with every way to reach ${handle}.`, url: cardUrl })}`;
}

type Signature = { html: string; text: string };

/**
 * A small email signature: the card's share image, linked to the card, and the link written out under it.
 * Not in the design. The image is the public card's (`/p/{handle}/opengraph-image`), which mail apps can load.
 */
function emailSignature(handle: string, cardLink: string): Signature {
  const cardUrl = escapeHtml(cardLink);
  const imageUrl = escapeHtml(`${cardLink}/opengraph-image`);
  const alt = escapeHtml(`${handle}’s agent card`);

  return {
    html: [
      '<table cellpadding="0" cellspacing="0" border="0" role="presentation">',
      `<tr><td><a href="${cardUrl}"><img src="${imageUrl}" width="300" height="158" alt="${alt}" style="display:block;border:0;border-radius:8px"></a></td></tr>`,
      `<tr><td style="padding-top:6px;font-family:monospace;font-size:12px;line-height:16px"><a href="${cardUrl}">${escapeHtml(writtenLink(cardLink))}</a></td></tr>`,
      '</table>',
    ].join(''),
    text: cardLink,
  };
}

/** Copies the signature as rich text, for mail apps that paste it as it looks, and as plain text otherwise. */
async function writeRichText({ html, text }: Signature): Promise<void> {
  if (typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard.write === 'function') {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        }),
      ]);

      return;
    } catch {
      // Some browsers take plain text only: the link alone still makes a signature.
    }
  }

  await navigator.clipboard.writeText(text);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Saves a file the page holds in memory, under the name given. */
function saveFile(file: Blob, name: string) {
  const href = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = href;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  // The browser has the file once the click went through; the address can go a moment later.
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
