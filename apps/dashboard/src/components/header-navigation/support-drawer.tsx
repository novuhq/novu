import { AnimatePresence, motion } from 'motion/react';
import { cloneElement, isValidElement, useState } from 'react';
import { RiBook2Line, RiCalendarEventLine, RiMessage3Line, RiNewspaperLine, RiRouteFill } from 'react-icons/ri';
import { DocsSearch } from '@/components/docs-assistant/docs-search';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';
import { IS_DOCS_ASSISTANT_ENABLED } from '@/config';
import { usePlainChat } from '@/hooks/use-plain-chat';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { DocsIframeView, FooterLink, SuggestionCard } from './support-drawer-components';
import {
  BOOK_DEMO_URL,
  CHANGELOG_URL,
  DRAWER_WIDTH_DEFAULT,
  DRAWER_WIDTH_EXPANDED,
  docsUrl,
  GETTING_STARTED,
  ROADMAP_URL,
  useContextualSuggestions,
} from './support-drawer-constants';

type SupportDrawerContentProps = {
  onClose: () => void;
  docsUrl: string | null;
  onOpenDocs: (url: string) => void;
  onCloseDocs: () => void;
};

function SupportDrawerContent({
  onClose,
  docsUrl: currentDocsUrl,
  onOpenDocs,
  onCloseDocs,
}: SupportDrawerContentProps) {
  const telemetry = useTelemetry();
  const { showPlainLiveChat, isLiveChatVisible } = usePlainChat();
  const suggestions = useContextualSuggestions();
  const [hasSearchQuery, setHasSearchQuery] = useState(false);

  const hasDocsAssistant = IS_DOCS_ASSISTANT_ENABLED;
  const isViewingDocs = currentDocsUrl !== null;

  function handleTrackSuggestion(title: string) {
    telemetry(TelemetryEvent.SUPPORT_DRAWER_SUGGESTION_CLICKED, { suggestionTitle: title });
  }

  function handleTrackDocsBack() {
    telemetry(TelemetryEvent.SUPPORT_DRAWER_DOCS_BACK_CLICKED);
  }

  function handleTrackDocsExternal() {
    telemetry(TelemetryEvent.SUPPORT_DRAWER_DOCS_EXTERNAL_CLICKED);
  }

  function handleShareFeedback() {
    if (isLiveChatVisible) {
      showPlainLiveChat();
      onClose();
    } else {
      handleOpenExternalLink(docsUrl());
    }
  }

  function handleOpenExternalLink(url: string) {
    window.open(url, '_blank noopener noreferrer');
    onClose();
  }

  if (isViewingDocs) {
    return (
      <DocsIframeView
        url={currentDocsUrl}
        onBack={onCloseDocs}
        onTrackBack={handleTrackDocsBack}
        onTrackExternal={handleTrackDocsExternal}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <VisuallyHidden>
        <SheetTitle>Support</SheetTitle>
        <SheetDescription>Get help and resources</SheetDescription>
      </VisuallyHidden>

      <div className="flex items-center justify-between px-3 py-3.5">
        <span className="text-foreground-600 text-sm font-medium leading-5 tracking-[-0.084px]">Need a hand?</span>
      </div>

      <div className="px-3 pb-2">
        {hasDocsAssistant ? <DocsSearch onOpenDocs={onOpenDocs} onQueryChange={setHasSearchQuery} /> : null}
      </div>

      <div className="flex-1 overflow-auto px-3 py-3">
        <AnimatePresence mode="wait">
          {!hasSearchQuery && (
            <motion.div
              key="suggestions-content"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex flex-col gap-6"
            >
              {suggestions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-foreground-600 px-1 text-sm font-medium leading-5 tracking-[-0.084px]">
                    Suggestions
                  </span>
                  <div className="flex flex-col gap-2">
                    {suggestions.map((item) => (
                      <SuggestionCard
                        key={item.title}
                        item={item}
                        onOpenDocs={onOpenDocs}
                        onTrack={handleTrackSuggestion}
                      />
                    ))}
                  </div>
                </div>
              )}

              {GETTING_STARTED.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-foreground-600 px-1 text-sm font-medium leading-5 tracking-[-0.084px]">
                    Getting started
                  </span>
                  <div className="flex flex-col gap-2">
                    {GETTING_STARTED.map((item) => (
                      <SuggestionCard
                        key={item.title}
                        item={item}
                        onOpenDocs={onOpenDocs}
                        onTrack={handleTrackSuggestion}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-0.5 p-1.5">
        <FooterLink
          icon={RiBook2Line}
          onClick={() => {
            telemetry(TelemetryEvent.SUPPORT_DRAWER_DOCUMENTATION_CLICKED);
            handleOpenExternalLink(docsUrl());
          }}
        >
          Documentation
        </FooterLink>
        <FooterLink
          icon={RiNewspaperLine}
          onClick={() => {
            telemetry(TelemetryEvent.SUPPORT_DRAWER_CHANGELOG_CLICKED);
            handleOpenExternalLink(CHANGELOG_URL);
          }}
        >
          What's new
        </FooterLink>
        <FooterLink
          icon={RiRouteFill}
          onClick={() => {
            telemetry(TelemetryEvent.SUPPORT_DRAWER_ROADMAP_CLICKED);
            handleOpenExternalLink(ROADMAP_URL);
          }}
        >
          Roadmap
        </FooterLink>
        <FooterLink
          icon={RiMessage3Line}
          onClick={() => {
            telemetry(TelemetryEvent.SUPPORT_DRAWER_CHAT_CLICKED);
            handleShareFeedback();
          }}
        >
          Chat with us
        </FooterLink>
        <FooterLink
          icon={RiCalendarEventLine}
          onClick={() => {
            telemetry(TelemetryEvent.SUPPORT_DRAWER_BOOK_DEMO_CLICKED);
            handleOpenExternalLink(BOOK_DEMO_URL);
          }}
        >
          <span>
            Book a demo <span className="text-foreground-400">(Yes, with a real human)</span>
          </span>
        </FooterLink>
      </div>
    </div>
  );
}

type SupportDrawerProps = {
  children: React.ReactElement;
};

export function SupportDrawer({ children }: SupportDrawerProps) {
  const telemetry = useTelemetry();
  const [isOpen, setIsOpen] = useState(false);
  const [docsUrl, setDocsUrl] = useState<string | null>(null);

  const isViewingDocs = docsUrl !== null;
  const drawerWidth = isViewingDocs ? DRAWER_WIDTH_EXPANDED : DRAWER_WIDTH_DEFAULT;

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (open) {
      telemetry(TelemetryEvent.SUPPORT_DRAWER_OPENED);
    }
    if (!open) {
      setDocsUrl(null);
    }
  }

  function handleOpenDocs(url: string) {
    setDocsUrl(url);
  }

  function handleCloseDocs() {
    setDocsUrl(null);
  }

  const trigger = isValidElement(children)
    ? cloneElement(children, { onClick: () => setIsOpen(true) } as React.HTMLAttributes<HTMLElement>)
    : children;

  return (
    <>
      {trigger}
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent
          className="border-stroke-soft m-[10px] h-[calc(100%-20px)] rounded-xl border bg-neutral-50 p-0 shadow-[0px_18px_88px_-4px_rgba(24,39,75,0.16)] transition-[width,max-width] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
          style={{ width: drawerWidth, maxWidth: drawerWidth }}
        >
          <SupportDrawerContent
            onClose={() => handleOpenChange(false)}
            docsUrl={docsUrl}
            onOpenDocs={handleOpenDocs}
            onCloseDocs={handleCloseDocs}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
