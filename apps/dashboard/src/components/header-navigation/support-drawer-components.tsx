import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { RiArrowLeftLine, RiExternalLinkLine, RiLoaderLine } from 'react-icons/ri';
import { SuggestionItem, toEmbedUrl } from './support-drawer-constants';

type SuggestionCardProps = {
  item: SuggestionItem;
  onOpenDocs: (url: string) => void;
  onTrack: (title: string) => void;
};

export function SuggestionCard({ item, onOpenDocs, onTrack }: SuggestionCardProps) {
  const Icon = item.icon;

  return (
    <button
      onClick={() => {
        onTrack(item.title);
        onOpenDocs(item.url);
      }}
      className="bg-background hover:bg-neutral-50 border-stroke-soft group flex w-full items-center gap-2 rounded-xl border p-2 transition-colors text-left"
    >
      <div className="border-stroke-soft flex shrink-0 items-center justify-center overflow-hidden rounded-lg border p-px">
        <div className="bg-neutral-alpha-50 group-hover:bg-white flex size-[54px] items-center justify-center rounded-[7px] transition-colors">
          <Icon className="text-foreground-300 size-4" />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-foreground-950 text-sm font-medium leading-5 tracking-[-0.084px]">{item.title}</span>
        <span className="text-foreground-400 text-xs leading-4">{item.description}</span>
      </div>
    </button>
  );
}

type DocsIframeViewProps = {
  url: string;
  onBack: () => void;
  onTrackBack: () => void;
  onTrackExternal: () => void;
};

export function DocsIframeView({ url, onBack, onTrackBack, onTrackExternal }: DocsIframeViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const embedUrl = toEmbedUrl(url);

  useEffect(() => {
    const ensurePrefetch = () => {
      const existingPrefetch = document.querySelector('link[rel="dns-prefetch"][href="https://docs.novu.co"]');
      const existingPreconnect = document.querySelector('link[rel="preconnect"][href="https://docs.novu.co"]');

      if (!existingPrefetch) {
        const prefetchLink = document.createElement('link');
        prefetchLink.rel = 'dns-prefetch';
        prefetchLink.href = 'https://docs.novu.co';
        document.head.appendChild(prefetchLink);
      }

      if (!existingPreconnect) {
        const preconnectLink = document.createElement('link');
        preconnectLink.rel = 'preconnect';
        preconnectLink.href = 'https://docs.novu.co';
        document.head.appendChild(preconnectLink);
      }
    };

    ensurePrefetch();
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 px-3 py-3.5 pr-14">
        <button
          onClick={() => {
            onTrackBack();
            onBack();
          }}
          className="hover:bg-neutral-100 -ml-1.5 flex size-5 items-center justify-center rounded transition-colors"
        >
          <RiArrowLeftLine className="text-foreground-600 size-3.5" />
        </button>
        <span className="text-foreground-600 flex-1 text-sm font-medium leading-5 tracking-[-0.084px]">
          Documentation
        </span>
        <button
          onClick={() => {
            onTrackExternal();
            window.open(url, '_blank noopener noreferrer');
          }}
          className="hover:bg-neutral-100 flex size-5 items-center justify-center rounded transition-colors"
          title="Open in new tab"
        >
          <RiExternalLinkLine className="text-foreground-600 size-3.5" />
        </button>
      </div>
      <div className="relative flex-1 overflow-hidden rounded-b-xl">
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              className="absolute inset-0 flex items-center justify-center bg-neutral-50"
            >
              <RiLoaderLine className="text-foreground-400 size-6 animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>
        <iframe
          src={embedUrl}
          className="h-full w-full border-0"
          onLoad={() => setIsLoading(false)}
          title="Documentation"
        />
      </div>
    </div>
  );
}

type FooterLinkProps = {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick: () => void;
};

export function FooterLink({ icon: Icon, children, onClick }: FooterLinkProps) {
  return (
    <button
      onClick={onClick}
      className="hover:bg-neutral-alpha-50 flex h-7 w-full items-center gap-1.5 rounded-md px-2 transition-colors"
    >
      <Icon className="text-foreground-600 size-4 shrink-0" />
      <span className="text-foreground-950 text-sm font-medium leading-5 tracking-[-0.28px]">{children}</span>
    </button>
  );
}
