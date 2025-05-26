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
import { Separator } from '@/components/primitives/separator';
import { buttonVariants } from '@/components/primitives/button';
import { cn } from '@/utils/ui';
import type { SchemaChanges, SchemaChange } from '../schema-editor/utils/schema-change-detection';

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
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="bg-bg-weak flex h-8 w-8 items-center justify-center rounded-lg">{icon}</div>
        <h4 className="text-text-strong text-sm font-medium">{title}</h4>
        <Badge variant="light" color={variant} size="sm">
          {changes.length}
        </Badge>
      </div>

      <div className="space-y-3">
        {changes.map((change, index) => (
          <div
            key={index}
            className="border-stroke-soft bg-bg-white shadow-xs hover:border-stroke-sub group rounded-xl border p-4 transition-all duration-200 hover:shadow-sm"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {change.originalKey && (
                      <code className="bg-bg-weak text-text-strong rounded-md px-2 py-1 font-mono text-xs font-medium">
                        {change.originalKey}
                      </code>
                    )}
                    {change.newKey && change.originalKey && (
                      <>
                        <div className="flex h-5 w-5 items-center justify-center">
                          <div className="bg-text-soft h-px w-3"></div>
                          <div className="border-l-text-soft h-0 w-0 border-b-[3px] border-l-[3px] border-r-0 border-t-[3px] border-b-transparent border-t-transparent"></div>
                        </div>
                        <code className="bg-primary-alpha-10 text-primary-base rounded-md px-2 py-1 font-mono text-xs font-medium">
                          {change.newKey}
                        </code>
                      </>
                    )}
                    {change.newKey && !change.originalKey && (
                      <code className="bg-success-alpha-10 text-success-base rounded-md px-2 py-1 font-mono text-xs font-medium">
                        {change.newKey}
                      </code>
                    )}
                  </div>

                  {change.type === 'typeChanged' && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-text-soft">Type:</span>
                      <code className="bg-bg-weak text-text-sub rounded px-1.5 py-0.5 font-mono">
                        {change.originalType}
                      </code>
                      <div className="flex h-4 w-4 items-center justify-center">
                        <div className="bg-text-soft h-px w-2"></div>
                        <div className="border-l-text-soft h-0 w-0 border-b-[2px] border-l-[2px] border-r-0 border-t-[2px] border-b-transparent border-t-transparent"></div>
                      </div>
                      <code className="bg-information-light text-information-dark rounded px-1.5 py-0.5 font-mono">
                        {change.newType}
                      </code>
                    </div>
                  )}

                  {change.type === 'requiredChanged' && (
                    <div className="text-text-sub text-xs">
                      <span className="text-text-soft">Required:</span>{' '}
                      <span className={change.originalRequired ? 'text-success-base' : 'text-text-sub'}>
                        {change.originalRequired ? 'Yes' : 'No'}
                      </span>
                      {' → '}
                      <span className={change.newRequired ? 'text-success-base' : 'text-text-sub'}>
                        {change.newRequired ? 'Yes' : 'No'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {change.usageInfo.isUsed && (
                <div className="border-warning-light bg-warning-lighter rounded-lg border p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <RiAlertLine className="text-warning-base h-4 w-4" />
                    <span className="text-warning-dark text-xs font-medium">Used in workflow steps</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {change.usageInfo.usedInSteps.map((step) => (
                      <Badge key={step.stepId} variant="stroke" color="orange" size="sm" className="bg-bg-white">
                        {step.stepName}
                      </Badge>
                    ))}
                  </div>
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

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="flex max-h-[85vh] max-w-3xl flex-col overflow-hidden">
        <AlertDialogHeader className="pb-4">
          <div className="flex items-start gap-3">
            <div className="bg-warning-light flex h-10 w-10 items-center justify-center rounded-xl">
              <RiAlertLine className="text-warning-base h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1">
              <AlertDialogTitle className="text-text-strong text-lg font-semibold">
                Confirm Schema Changes
              </AlertDialogTitle>
              <AlertDialogDescription className="text-text-sub text-sm">
                You're making <strong className="text-text-strong">{totalChanges}</strong> change
                {totalChanges === 1 ? '' : 's'} to variables that are currently used in your workflow. This may cause
                errors in the affected steps.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-1 px-5">
          <VariableChangeSection
            title="Deleted Variables"
            changes={changes.deleted}
            icon={<RiDeleteBinLine className="text-error-base h-4 w-4" />}
            variant="red"
          />

          <VariableChangeSection
            title="Added Variables"
            changes={changes.added}
            icon={<RiEditLine className="text-information-base h-4 w-4" />}
            variant="blue"
          />

          <VariableChangeSection
            title="Type Changes"
            changes={changes.typeChanged}
            icon={<RiToggleLine className="text-warning-base h-4 w-4" />}
            variant="orange"
          />

          <VariableChangeSection
            title="Required Status Changes"
            changes={changes.requiredChanged}
            icon={<RiToggleLine className="text-feature-base h-4 w-4" />}
            variant="purple"
          />
        </div>

        <div className="pt-4">
          <Separator className="mb-6" />
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel onClick={onClose} className="min-w-20">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirm}
              className={cn('min-w-28', buttonVariants({ variant: 'secondary', mode: 'filled' }).root())}
            >
              Save Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
