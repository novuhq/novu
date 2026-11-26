import { PanelLeftClose } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { type RefObject, useEffect, useRef } from 'react';
import { RiAddLine, RiCloseLine } from 'react-icons/ri';
import { BroomSparkle } from '@/components/icons/broom-sparkle';
import { cn } from '@/utils/ui';
import { CopilotLauncher } from './copilot-launcher';
import { useCopilotPageView } from './copilot-page-view-store';
import {
  COPILOT_FLOATING_GAP,
  COPILOT_PANEL_WIDTH,
  type CopilotPanelLayout,
  type CopilotPanelPlacement,
  type CopilotViewport,
  clampCopilotFloatingPosition,
  getCopilotAnchoredBottom,
  getCopilotFloatingHeight,
} from './copilot-panel-layout';
import { setCopilotPanelLayout, showCopilotDock, useCopilotPanelPlacement } from './copilot-panel-store';
import { useCopilotPopoverTitle } from './copilot-popover-title';
import { COPILOT_SURFACE_PROPS } from './copilot-surface';
import { CopilotThreadPanel } from './copilot-thread-panel';
import { useCopilotWebChat } from './copilot-web-chat-context';
import { COPILOT_DOCK_TRANSITION, COPILOT_POPOVER_ID, COPILOT_SHEET_LIFT_PX } from './copilot-web-chat-utils';
import { type CopilotPanelDrag, useCopilotPanelDrag } from './use-copilot-panel-drag';
import { useModalDialogOpen } from './use-modal-dialog-open';

// Floating, it mirrors the Popover primitive: fade, zoom from 95% and an 8px rise, growing out of the launcher.
const FLOATING_HIDDEN = { opacity: 0, scale: 0.95, x: 0, y: 8 };
// Docked, it slides in from the right edge while the page makes room for it.
const DOCKED_HIDDEN = { opacity: 1, scale: 1, x: COPILOT_PANEL_WIDTH, y: 0 };
const SHOWN = { opacity: 1, scale: 1, x: 0, y: 0 };
const REDUCED_HIDDEN = { opacity: 0 };
const REDUCED_SHOWN = { opacity: 1 };
const POPOVER_TRANSITION = { duration: 0.15, ease: 'easeOut' } as const;

const FLOATING_SHADOW = 'shadow-[0_2px_4px_rgba(15,18,26,0.04),0_12px_32px_-8px_rgba(15,18,26,0.08)]';

/** Where the panel is drawn this render: while it is dragged, it follows the pointer whatever was chosen. */
type ShownPlacement = CopilotPanelPlacement | { kind: 'dragging' };

type PanelGeometry = { className: string; style: React.ComponentProps<typeof motion.div>['style'] };

function getPanelGeometry({
  shown,
  drag,
  viewport,
  topLimit,
  isOverSheet,
}: {
  shown: ShownPlacement;
  drag: CopilotPanelDrag;
  viewport: CopilotViewport;
  topLimit: number;
  isOverSheet: boolean;
}): PanelGeometry {
  const freeHeight = getCopilotFloatingHeight({
    viewportHeight: viewport.height,
    topLimit,
    bottomGap: COPILOT_FLOATING_GAP,
  });

  // Every placement sets all four edges: motion writes the dragged `left`/`top` straight to the element, so an edge a
  // placement left out would keep the value the drag ended on.
  switch (shown.kind) {
    case 'docked':
      return {
        className: 'border-l',
        style: { top: shown.top, right: 0, bottom: 0, left: 'auto', width: COPILOT_PANEL_WIDTH },
      };
    case 'anchored': {
      const bottom = getCopilotAnchoredBottom(isOverSheet ? COPILOT_SHEET_LIFT_PX : 0);
      const height = getCopilotFloatingHeight({ viewportHeight: viewport.height, topLimit, bottomGap: bottom });

      return {
        className: cn('origin-bottom-right rounded-xl border', FLOATING_SHADOW),
        style: { top: 'auto', right: 16, bottom, left: 'auto', height, width: COPILOT_PANEL_WIDTH },
      };
    }
    case 'free': {
      // Clamped on every render, so a smaller window never leaves the panel out of reach or over the top bar.
      const { left, top } = clampCopilotFloatingPosition(shown.position, { viewport, height: freeHeight, topLimit });

      return {
        className: cn('origin-top rounded-xl border', FLOATING_SHADOW),
        style: { top, right: 'auto', bottom: 'auto', left, height: freeHeight, width: COPILOT_PANEL_WIDTH },
      };
    }
    case 'dragging':
      return {
        className: cn('rounded-xl border', FLOATING_SHADOW),
        style: {
          top: drag.top,
          right: 'auto',
          bottom: 'auto',
          left: drag.left,
          height: freeHeight,
          width: COPILOT_PANEL_WIDTH,
        },
      };
    default: {
      const unhandled: never = shown;

      return unhandled;
    }
  }
}

function HeaderButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-6 cursor-pointer items-center justify-center rounded-md text-text-soft hover:bg-bg-soft hover:text-text-strong disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function CopilotPopover({
  panelRef,
  layout,
  shown,
  canDock,
  drag,
  viewport,
  topLimit,
}: {
  panelRef: RefObject<HTMLDivElement | null>;
  layout: CopilotPanelLayout;
  shown: ShownPlacement;
  canDock: boolean;
  drag: CopilotPanelDrag;
  viewport: CopilotViewport;
  topLimit: number;
}) {
  const { isAvailable, isOpen, close, chat, startNewConversation, isBusy } = useCopilotWebChat();
  const title = useCopilotPopoverTitle(chat);
  // Above a sheet (z-50) and its overlay, with the launcher, as the design shows it.
  const isOverSheet = !!useCopilotPageView()?.overSheet;
  // Back under a modal dialog opened over the sheet, which dims and blocks everything else.
  const isModalDialogOpen = useModalDialogOpen();
  const shouldReduceMotion = useReducedMotion();
  const isShown = isOpen && isAvailable;
  const isDocked = shown.kind === 'docked';
  const geometry = getPanelGeometry({ shown, drag, viewport, topLimit, isOverSheet });
  const hidden = isDocked ? DOCKED_HIDDEN : FLOATING_HIDDEN;
  // Read during render: true only when the previous render was docked too, so a panel that just docked lands in place.
  const wasDockedRef = useRef(false);

  useEffect(() => (isShown && isDocked ? showCopilotDock() : undefined), [isShown, isDocked]);
  useEffect(() => {
    wasDockedRef.current = isDocked;
  });

  return (
    <AnimatePresence>
      {isShown && (
        <motion.div
          ref={panelRef}
          id={COPILOT_POPOVER_ID}
          {...COPILOT_SURFACE_PROPS}
          data-copilot-placement={shown.kind}
          role="dialog"
          aria-label="Novu Copilot"
          initial={shouldReduceMotion ? REDUCED_HIDDEN : hidden}
          animate={shouldReduceMotion ? REDUCED_SHOWN : SHOWN}
          exit={shouldReduceMotion ? REDUCED_HIDDEN : hidden}
          transition={isDocked ? COPILOT_DOCK_TRANSITION : POPOVER_TRANSITION}
          style={geometry.style}
          className={cn(
            'fixed flex flex-col overflow-hidden border-stroke-soft bg-bg-white',
            // Over a sheet it glides up with the launcher, clear of the sheet's footer, with the sheet's 500ms slide-in.
            shown.kind === 'anchored' && 'transition-[bottom] duration-500 ease-in-out motion-reduce:transition-none',
            // Docked, it grows to the full height beside a sheet (and back) with the same slide.
            isDocked &&
              wasDockedRef.current &&
              'transition-[top] duration-500 ease-in-out motion-reduce:transition-none',
            geometry.className,
            isOverSheet && !isModalDialogOpen ? 'z-[51]' : 'z-40'
          )}
        >
          <div
            {...drag.handleProps}
            className={cn(
              'flex h-11 shrink-0 touch-none select-none items-center gap-2 border-b border-stroke-soft bg-bg-weak pl-3.5 pr-2',
              drag.isDragging ? 'cursor-grabbing' : 'cursor-grab'
            )}
          >
            <BroomSparkle className="size-4 shrink-0" isAnimating={isBusy} />
            <span className="min-w-0 flex-1 truncate text-label-sm text-text-sub">{title}</span>
            <HeaderButton label="New chat" disabled={!!chat?.isRunning} onClick={startNewConversation}>
              <RiAddLine className="size-3.5" />
            </HeaderButton>
            {(canDock || isDocked) && (
              <HeaderButton
                label={isDocked ? 'Undock' : 'Dock to the side'}
                onClick={() => setCopilotPanelLayout({ ...layout, mode: isDocked ? 'floating' : 'docked' })}
              >
                <PanelLeftClose className="size-3.5" />
              </HeaderButton>
            )}
            <HeaderButton label="Close" onClick={close}>
              <RiCloseLine className="size-3.5" />
            </HeaderButton>
          </div>
          <CopilotThreadPanel />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** While a dragged panel is over the right edge: where dropping it docks it. */
function CopilotDockPreview({ isVisible, top }: { isVisible: boolean; top: number | undefined }) {
  return (
    <AnimatePresence>
      {isVisible && top !== undefined && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={COPILOT_DOCK_TRANSITION}
          style={{ top, width: COPILOT_PANEL_WIDTH }}
          className="pointer-events-none fixed bottom-0 right-0 z-40 border-l-2 border-dashed border-primary-base bg-primary-alpha-10"
        />
      )}
    </AnimatePresence>
  );
}

/** Shows the launcher/popover only once a page registered its context: the canvas or step editor, or a Copilot page. */
export function CopilotPopoverMount() {
  const { pageContext, isOpen, isAvailable } = useCopilotWebChat();
  const panelRef = useRef<HTMLDivElement>(null);
  const { layout, placement, dockedTop, topLimit, canDock, viewport } = useCopilotPanelPlacement();
  const drag = useCopilotPanelDrag({ panelRef, layout, canDock, topLimit, isShown: isOpen && isAvailable });
  const shown: ShownPlacement = drag.isDragging ? { kind: 'dragging' } : placement;

  if (!pageContext?.workflowId && !pageContext?.page) return null;

  return (
    <>
      {/* The panel grows out of the launcher only while it floats above it; anywhere else the launcher steps aside. */}
      <CopilotLauncher isHiddenWhileOpen={shown.kind !== 'anchored'} />
      <CopilotDockPreview isVisible={drag.isOverDockZone} top={dockedTop} />
      <CopilotPopover
        panelRef={panelRef}
        layout={layout}
        shown={shown}
        canDock={canDock}
        drag={drag}
        viewport={viewport}
        topLimit={topLimit}
      />
    </>
  );
}
