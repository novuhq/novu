import { AnimatePresence, motion } from 'motion/react';
import { cloneElement, createContext, isValidElement, useCallback, useContext, useMemo, useState } from 'react';
import {
  RiBook2Line,
  RiCalendarEventLine,
  RiMessage3Line,
  RiNewspaperLine,
  RiRouteFill,
  RiSparkling2Line,
} from 'react-icons/ri';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';
import { IS_AI_FEATURES_ENABLED } from '@/config';
import { usePlainChat } from '@/hooks/use-plain-chat';
import { useTelemetry } from '@/hooks/use-telemetry';
import { openMintlifyAssistant } from '@/utils/mintlify-assistant';
import { TelemetryEvent } from '@/utils/telemetry';
import { FooterLink, SuggestionCard } from './support-drawer-components';
import {
  BOOK_DEMO_URL,
  CHANGELOG_URL,
  DRAWER_WIDTH_DEFAULT,
  docsUrl,
  ROADMAP_URL,
  useContextualGettingStarted,
  useContextualSuggestions,
} from './support-drawer-constants';

type SupportDrawerContextType = {
  isOpen: boolean;
  openSupportDrawer: () => void;
  closeSupportDrawer: () => void;
};

const SupportDrawerContext = createContext<SupportDrawerContextType | null>(null);

export function useSupportDrawer() {
  const context = useContext(SupportDrawerContext);

  if (!context) {
    throw new Error('useSupportDrawer must be used within a SupportDrawerProvider');
  }

  return context;
}

function SupportDrawerContent({ onClose }: { onClose: () => void }) {
  const telemetry = useTelemetry();
  const { showPlainLiveChat, isLiveChatVisible } = usePlainChat();
  const suggestions = useContextualSuggestions();
  const gettingStarted = useContextualGettingStarted();

  function handleTrackSuggestion(title: string) {
    telemetry(TelemetryEvent.SUPPORT_DRAWER_SUGGESTION_CLICKED, { suggestionTitle: title });
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

  function handleAskAi() {
    if (!IS_AI_FEATURES_ENABLED) {
      return;
    }

    telemetry(TelemetryEvent.SUPPORT_DRAWER_ASK_AI_CLICKED, { source: 'support-drawer' });
    onClose();
    void openMintlifyAssistant({ source: 'support-drawer' });
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

      <div className="flex-1 overflow-auto px-3 py-3">
        <AnimatePresence mode="wait">
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
                      onOpenUrl={handleOpenExternalLink}
                      onTrack={handleTrackSuggestion}
                    />
                  ))}
                </div>
              </div>
            )}

            {gettingStarted.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-foreground-600 px-1 text-sm font-medium leading-5 tracking-[-0.084px]">
                  Getting started
                </span>
                <div className="flex flex-col gap-2">
                  {gettingStarted.map((item) => (
                    <SuggestionCard
                      key={item.title}
                      item={item}
                      onOpenUrl={handleOpenExternalLink}
                      onTrack={handleTrackSuggestion}
                    />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
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
        {IS_AI_FEATURES_ENABLED ? (
          <FooterLink icon={RiSparkling2Line} onClick={handleAskAi}>
            Ask AI
          </FooterLink>
        ) : null}
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

export function SupportDrawerProvider({ children }: { children: React.ReactNode }) {
  const telemetry = useTelemetry();
  const [isOpen, setIsOpen] = useState(false);

  const closeSupportDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);

  const openSupportDrawer = useCallback(() => {
    setIsOpen(true);
    telemetry(TelemetryEvent.SUPPORT_DRAWER_OPENED);
  }, [telemetry]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        closeSupportDrawer();
      }
    },
    [closeSupportDrawer]
  );

  const value = useMemo(
    () => ({
      isOpen,
      openSupportDrawer,
      closeSupportDrawer,
    }),
    [isOpen, openSupportDrawer, closeSupportDrawer]
  );

  return (
    <SupportDrawerContext.Provider value={value}>
      {children}
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent
          className="border-stroke-soft m-[10px] h-[calc(100%-20px)] rounded-xl border bg-neutral-50 p-0 shadow-[0px_18px_88px_-4px_rgba(24,39,75,0.16)]"
          style={{ width: DRAWER_WIDTH_DEFAULT, maxWidth: DRAWER_WIDTH_DEFAULT }}
        >
          {isOpen ? <SupportDrawerContent onClose={closeSupportDrawer} /> : null}
        </SheetContent>
      </Sheet>
    </SupportDrawerContext.Provider>
  );
}

type SupportDrawerTriggerProps = {
  children: React.ReactElement;
};

/** Opens the support drawer from a trigger element (e.g. header help button). */
export function SupportDrawerTrigger({ children }: SupportDrawerTriggerProps) {
  const { openSupportDrawer } = useSupportDrawer();

  if (!isValidElement(children)) {
    return children;
  }

  return cloneElement(children, {
    onClick: () => openSupportDrawer(),
  } as React.HTMLAttributes<HTMLElement>);
}
