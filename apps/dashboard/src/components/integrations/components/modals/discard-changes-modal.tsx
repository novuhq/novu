import { RiErrorWarningFill } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/primitives/dialog';
import { cn } from '@/utils/ui';

/** The design's compact 28px buttons: 13px label, 6px corners. */
const COMPACT_BUTTON = 'h-7 shrink-0 rounded-md px-2 text-[13px] leading-[1.1]';
/**
 * Centers the modal on the manage drawer rather than the viewport. The drawer is pinned right and is full width up
 * to 900px (`getSheetWidth` in integration-sheet.tsx), so its center sits this far right of the viewport's.
 */
const CENTER_ON_DRAWER = 'ml-[calc((100vw_-_min(100vw,900px))/2)]';

/** "Name", "Name and API Key", "Name, API Key and 2 other fields". */
function listFields(fields: string[]) {
  if (fields.length === 0) return 'this integration';
  if (fields.length === 1) return fields[0];
  if (fields.length === 2) return `${fields[0]} and ${fields[1]}`;
  const others = fields.length - 2;

  return `${fields[0]}, ${fields[1]} and ${others} other ${others === 1 ? 'field' : 'fields'}`;
}

export type DiscardChangesModalProps = {
  isOpen: boolean;
  /** Labels of the edited fields, as the form shows them. */
  changedFields: string[];
  environmentName?: string;
  /** What leaving does, finishing "If you … now": "close the drawer", "switch to Production". */
  action: string;
  onKeepEditing: () => void;
  onDiscard: () => void;
};

/** Asks before unsaved edits in the manage integration drawer are thrown away. */
export function DiscardChangesModal({
  isOpen,
  changedFields,
  environmentName,
  action,
  onKeepEditing,
  onDiscard,
}: DiscardChangesModalProps) {
  const where = environmentName ? ` in ${environmentName}` : '';
  const loss = changedFields.length > 1 ? 'the changes are lost' : 'the change is lost';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onKeepEditing()}>
      <DialogContent
        hideCloseButton
        className={cn(
          'w-[400px] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden rounded-xl border-0 p-0',
          CENTER_ON_DRAWER,
          'shadow-[0_16px_32px_0_rgba(0,0,0,0.08),0_8px_16px_0_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.08)]'
        )}
      >
        <div className="flex flex-col gap-3.5 px-5 pb-[18px] pt-5">
          <span className="bg-warning-base/10 text-warning-base flex size-9 items-center justify-center rounded-lg">
            <RiErrorWarningFill className="size-[18px]" />
          </span>
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-label-md text-text-strong">Discard unsaved changes?</DialogTitle>
            <DialogDescription className="text-paragraph-xs text-text-sub">
              You changed {listFields(changedFields)}
              {where}. If you {action} now, {loss}.
            </DialogDescription>
          </div>
        </div>

        <div className="border-stroke-soft bg-bg-weak flex items-center justify-end gap-2 border-t px-4 py-3">
          <Button
            type="button"
            variant="secondary"
            mode="outline"
            size="2xs"
            className={cn(COMPACT_BUTTON, 'text-text-strong')}
            onClick={onKeepEditing}
          >
            Keep editing
          </Button>
          <Button
            type="button"
            variant="error"
            mode="gradient"
            size="2xs"
            className={COMPACT_BUTTON}
            onClick={onDiscard}
          >
            Discard changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
