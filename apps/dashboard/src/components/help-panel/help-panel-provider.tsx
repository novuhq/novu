import { FeatureFlagsKeysEnum } from '@novu/shared';
import { type ReactNode, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/primitives/popover';
import { IS_CLOUD } from '@/config';
import { useEscapeKeyManager } from '@/context/escape-key-manager/hooks';
import { EscapeKeyManagerPriority } from '@/context/escape-key-manager/priority';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { HelpPanel } from './help-panel';
import { HelpPanelContext, type HelpPanelOpenSource } from './help-panel-context';
import { isHelpPanelShortcut } from './help-panel-shortcut';

const VIEWPORT_GUTTER = 10;
const FALLBACK_ANCHOR_TOP = 8;
const FALLBACK_ANCHOR_HEIGHT = 32;

type HelpPanelPopoverProps = {
  isOpen: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  anchors: Set<HTMLElement>;
  onOpen: (source: HelpPanelOpenSource) => void;
  onClose: () => void;
};

function isVisibleElement(element: HTMLElement): boolean {
  return element.isConnected && element.getClientRects().length > 0;
}

/** Everything that only exists while the help panel is enabled: the popover, ⌘/ and Escape handling. */
function HelpPanelPopover({ isOpen, inputRef, anchors, onOpen, onClose }: HelpPanelPopoverProps) {
  // Triggers are responsive (field on desktop, icon on smaller screens), so anchor to whichever is visible
  // and fall back to the top-right corner on pages without the header.
  const virtualAnchorRef = useRef({
    getBoundingClientRect: () => {
      const anchor = [...anchors].find(isVisibleElement);

      return (
        anchor?.getBoundingClientRect() ??
        new DOMRect(window.innerWidth - VIEWPORT_GUTTER, FALLBACK_ANCHOR_TOP, 0, FALLBACK_ANCHOR_HEIGHT)
      );
    },
  });

  useEscapeKeyManager('help-panel', onClose, EscapeKeyManagerPriority.POPOVER, isOpen);

  useEffect(() => {
    // Bubble phase so editors that bind Mod-/ (e.g. CodeMirror toggle comment) can claim it first.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !isHelpPanelShortcut(event)) {
        return;
      }

      event.preventDefault();

      if (isOpen) {
        onClose();
      } else {
        onOpen('shortcut');
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onOpen, onClose]);

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <PopoverAnchor virtualRef={virtualAnchorRef} />
      <PopoverContent
        side="bottom"
        align="end"
        collisionPadding={VIEWPORT_GUTTER}
        aria-label="Help"
        className="w-[400px] min-w-0 max-w-[calc(100vw-20px)] overflow-hidden rounded-12 border-stroke-soft bg-bg-weak p-0 shadow-md"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
        onInteractOutside={(event) => {
          // Let trigger clicks through so they focus the open panel instead of closing and reopening it.
          const target = event.target;

          if (target instanceof Node && [...anchors].some((anchor) => anchor.contains(target))) {
            event.preventDefault();
          }
        }}
      >
        <HelpPanel inputRef={inputRef} onClose={onClose} />
      </PopoverContent>
    </Popover>
  );
}

export function HelpPanelProvider({ children }: { children: ReactNode }) {
  const telemetry = useTelemetry();
  const isFlagEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONTEXTUAL_HELP_DRAWER_ENABLED);
  const isEnabled = IS_CLOUD && isFlagEnabled;
  const [isOpen, setIsOpen] = useState(false);
  const anchorsRef = useRef(new Set<HTMLElement>());
  const inputRef = useRef<HTMLInputElement>(null);

  const closeHelpPanel = useCallback(() => {
    setIsOpen(false);
  }, []);

  const openHelpPanel = useCallback(
    (source: HelpPanelOpenSource) => {
      if (isOpen) {
        inputRef.current?.focus();

        return;
      }

      telemetry(TelemetryEvent.SUPPORT_DRAWER_OPENED, { source });
      setIsOpen(true);
    },
    [isOpen, telemetry]
  );

  const registerAnchor = useCallback((element: HTMLElement | null) => {
    if (!element) {
      return undefined;
    }

    anchorsRef.current.add(element);

    return () => {
      anchorsRef.current.delete(element);
    };
  }, []);

  const value = useMemo(
    () => ({ isEnabled, isOpen, openHelpPanel, closeHelpPanel, registerAnchor }),
    [isEnabled, isOpen, openHelpPanel, closeHelpPanel, registerAnchor]
  );

  return (
    <HelpPanelContext.Provider value={value}>
      {children}
      {isEnabled ? (
        <HelpPanelPopover
          isOpen={isOpen}
          inputRef={inputRef}
          anchors={anchorsRef.current}
          onOpen={openHelpPanel}
          onClose={closeHelpPanel}
        />
      ) : null}
    </HelpPanelContext.Provider>
  );
}
