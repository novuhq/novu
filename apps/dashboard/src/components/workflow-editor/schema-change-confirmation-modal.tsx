import { RiAlertLine, RiDeleteBinLine, RiEditLine, RiToggleLine } from 'react-icons/ri';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/primitives/alert-dialog';
import { Badge } from '@/components/primitives/badge';
import { buttonVariants } from '@/components/primitives/button';
import { Separator } from '@/components/primitives/separator';
import { cn } from '@/utils/ui';
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

function VariableChangeSection({ title, changes, icon, variant }: VariableChangeSectionProps) {
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
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader className="px-4">
          <div className="flex items-center gap-3">
            <div className="bg-warning-light flex h-9 w-9 items-center justify-center rounded-lg">
              <RiAlertLine className="text-warning-base h-4 w-4" />
            </div>
            <div>
              <AlertDialogTitle className="text-base">Confirm Schema Changes</AlertDialogTitle>
              <AlertDialogDescription className="text-sm">
                {totalChanges} change{totalChanges === 1 ? '' : 's'} detected
                {usedChanges > 0 && (
                  <span className="text-warning-base"> • {usedChanges} affecting existing steps</span>
                )}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogDescription className="px-4">
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
        </AlertDialogDescription>
        <Separator className="mt-4" />
        <AlertDialogFooter className="px-4">
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(buttonVariants({ variant: 'secondary', mode: 'filled' }).root())}
          >
            Save Changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
