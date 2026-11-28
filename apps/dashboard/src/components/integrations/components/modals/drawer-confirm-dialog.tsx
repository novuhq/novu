import type { ReactNode } from 'react';
import { Button } from '@/components/primitives/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/primitives/dialog';
import { cn } from '@/utils/ui';

/** The design's compact 28px buttons: 13px label, 6px corners. */
const COMPACT_BUTTON = 'h-7 shrink-0 rounded-md px-2 text-[13px] leading-[1.1]';
/**
 * Centers the dialog on the manage drawer rather than the viewport. The drawer is pinned right and is full width up
 * to 900px (`getSheetWidth` in integration-sheet.tsx), so its center sits this far right of the viewport's.
 */
const CENTER_ON_DRAWER = 'ml-[calc((100vw_-_min(100vw,900px))/2)]';

type DrawerConfirmDialogProps = {
  isOpen: boolean;
  /** The icon inside the 36px tile. */
  icon: ReactNode;
  /** Tile colors: a warning tint, or the neutral bordered tile. */
  iconTileClassName: string;
  title: string;
  description: ReactNode;
  /** A quieter line under the description. */
  note?: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  confirmVariant: 'primary' | 'error';
  isLoading?: boolean;
  /** Dialog width in the design: 400px or 440px. */
  className?: string;
  /** Over the manage drawer it's centered on the drawer; elsewhere (an integration card) on the page. */
  centerOn?: 'drawer' | 'page';
  onCancel: () => void;
  onConfirm: () => void;
};

/** A confirmation over the manage integration drawer: icon tile, title, description, Cancel and the action. */
export function DrawerConfirmDialog({
  isOpen,
  icon,
  iconTileClassName,
  title,
  description,
  note,
  cancelLabel,
  confirmLabel,
  confirmVariant,
  isLoading,
  className,
  centerOn = 'drawer',
  onCancel,
  onConfirm,
}: DrawerConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onCancel()}>
      <DialogContent
        hideCloseButton
        className={cn(
          'w-[400px] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden rounded-xl border-0 p-0',
          centerOn === 'drawer' && CENTER_ON_DRAWER,
          'shadow-[0_16px_32px_0_rgba(0,0,0,0.08),0_8px_16px_0_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.08)]',
          className
        )}
      >
        <div className={cn('flex flex-col gap-3.5 px-5 pt-5', note ? 'pb-4' : 'pb-[18px]')}>
          <span className={cn('flex size-9 items-center justify-center rounded-lg', iconTileClassName)}>{icon}</span>
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-label-md text-text-strong">{title}</DialogTitle>
            <DialogDescription className="text-paragraph-xs text-text-sub">{description}</DialogDescription>
          </div>
          {note && <p className="text-paragraph-xs text-text-soft">{note}</p>}
        </div>

        <div className="border-stroke-soft bg-bg-weak flex items-center justify-end gap-2 border-t px-4 py-3">
          <Button
            type="button"
            variant="secondary"
            mode="outline"
            size="2xs"
            className={cn(COMPACT_BUTTON, 'text-text-strong')}
            disabled={isLoading}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            mode="gradient"
            size="2xs"
            className={COMPACT_BUTTON}
            isLoading={isLoading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
