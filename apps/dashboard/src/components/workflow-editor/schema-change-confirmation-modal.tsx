import { Cross2Icon } from '@radix-ui/react-icons';
import { RiAlertLine, RiDeleteBinLine, RiEditLine, RiToggleLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/primitives/dialog';
import type { SchemaChange, SchemaChanges } from '../schema-editor/utils/schema-change-detection';

interface SchemaChangeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  changes: SchemaChanges;
}

interface VariableChangeSectionProps {
  title: string;
  changes: SchemaChange[];
  icon: React.ReactNode;
  variant: 'red' | 'orange' | 'blue' | 'purple';
}

function VariableChangeSection({ title, changes, icon }: VariableChangeSectionProps) {
  if (changes.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-text-strong text-sm font-medium">{title}</span>
      </div>

      <div className="space-y-1.5">
        {changes.map((change, index) => (
          <div
            key={index}
            className="border-stroke-soft bg-bg-weak/30 hover:bg-bg-weak/50 rounded-lg border px-3 py-2.5 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {change.originalKey && (
                  <code className="bg-bg-weak text-text-strong rounded px-2 py-0.5 font-mono text-xs">
                    {change.originalKey}
                  </code>
                )}

                {change.newKey && change.originalKey && (
                  <>
                    <span className="text-text-soft">→</span>
                    <code className="bg-primary-alpha-10 text-primary-base rounded px-2 py-0.5 font-mono text-xs">
                      {change.newKey}
                    </code>
                  </>
                )}

                {change.newKey && !change.originalKey && (
                  <code className="bg-success-alpha-10 text-success-base rounded px-2 py-0.5 font-mono text-xs">
                    {change.newKey}
                  </code>
                )}

                {change.type === 'typeChanged' && (
                  <div className="text-text-sub flex items-center gap-1.5 text-xs">
                    <span>{change.originalType}</span>
                    <span>→</span>
                    <span className="text-information-base">{change.newType}</span>
                  </div>
                )}

                {change.type === 'requiredChanged' && (
                  <div className="text-text-sub text-xs">
                    {change.originalRequired ? 'Required' : 'Optional'} → {change.newRequired ? 'Required' : 'Optional'}
                  </div>
                )}
              </div>

              {change.usageInfo.isUsed && (
                <div className="text-warning-base flex items-center gap-1.5 text-xs">
                  <RiAlertLine className="h-3.5 w-3.5" />
                  {change.usageInfo.usedInSteps.length === 1 ? (
                    <span>{change.usageInfo.usedInSteps[0].stepName}</span>
                  ) : (
                    <span
                      className="cursor-help"
                      title={change.usageInfo.usedInSteps.map((step) => step.stepName).join(', ')}
                    >
                      {change.usageInfo.usedInSteps.length} steps
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SchemaChangeConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  changes,
}: SchemaChangeConfirmationModalProps) {
  const totalChanges =
    changes.deleted.length + changes.added.length + changes.typeChanged.length + changes.requiredChanged.length;

  const usedChanges = [...changes.deleted, ...changes.added, ...changes.typeChanged, ...changes.requiredChanged].filter(
    (change) => change.usageInfo.isUsed
  ).length;

  return (
    <Dialog modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="min-w-[512px] max-w-[640px] gap-4 rounded-lg p-4 overflow-hidden" hideCloseButton>
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-warning/10">
              <RiAlertLine className="size-6 text-warning" />
            </div>
            <DialogClose>
              <Cross2Icon className="size-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>

          <div className="flex flex-col gap-1">
            <DialogTitle className="text-md font-medium">Confirm Schema Changes</DialogTitle>
            <DialogDescription className="text-foreground-600">
              {totalChanges} change{totalChanges === 1 ? '' : 's'} detected
              {usedChanges > 0 && <span className="text-warning"> • {usedChanges} affecting existing steps</span>}
            </DialogDescription>
          </div>

          <div className="max-h-96 space-y-4 overflow-y-auto">
            <VariableChangeSection
              title="Deleted"
              changes={changes.deleted}
              icon={<RiDeleteBinLine className="text-error-base h-4 w-4" />}
              variant="red"
            />

            <VariableChangeSection
              title="Added"
              changes={changes.added}
              icon={<RiEditLine className="text-success-base h-4 w-4" />}
              variant="blue"
            />

            <VariableChangeSection
              title="Type Changed"
              changes={changes.typeChanged}
              icon={<RiToggleLine className="text-warning-base h-4 w-4" />}
              variant="orange"
            />

            <VariableChangeSection
              title="Required Changed"
              changes={changes.requiredChanged}
              icon={<RiToggleLine className="text-feature-base h-4 w-4" />}
              variant="purple"
            />
          </div>

          <DialogFooter>
            <DialogClose asChild aria-label="Close">
              <Button
                type="button"
                size="sm"
                mode="outline"
                variant="secondary"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose();
                }}
              >
                Cancel
              </Button>
            </DialogClose>

            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onConfirm();
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
