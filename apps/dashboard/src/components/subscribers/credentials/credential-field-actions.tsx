import { AnimatePresence, motion } from 'motion/react';
import { RiCheckLine, RiCloseLine } from 'react-icons/ri';
import { CopyButton } from '@/components/primitives/copy-button';
import { DeleteButton } from '@/components/primitives/delete-button';
import { EditButton } from '@/components/primitives/edit-button';
import { cn } from '@/utils/ui';
import { CREDENTIAL_HOVER_ACTIONS_CLASS, CREDENTIAL_VISIBLE_ACTIONS_CLASS } from './credential-fields';

const iconButtonClassName = 'p-0.5 hover:bg-transparent';

const confirmButtonClassName =
  'inline-flex size-5 shrink-0 cursor-pointer select-none items-center justify-center rounded-full outline-hidden text-success transition duration-200 ease-out hover:bg-success/10';

const cancelButtonClassName =
  'inline-flex size-5 shrink-0 cursor-pointer select-none items-center justify-center rounded-full outline-hidden text-error-base transition duration-200 ease-out hover:bg-error-base/10';

const actionTransition = { duration: 0.15, ease: 'easeOut' as const };

type CredentialFieldActionsProps = {
  mode: 'view' | 'edit';
  copyValue?: string;
  copyLabel?: string;
  ariaEntity: string;
  isSaving?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
};

/**
 * Inline credential actions that swap between view (copy · edit · delete) and edit
 * (check · close) with a smooth crossfade, matching the workflow JSON payload editor.
 */
export function CredentialFieldActions({
  mode,
  copyValue,
  copyLabel,
  ariaEntity,
  isSaving = false,
  onEdit,
  onDelete,
  onConfirm,
  onCancel,
}: CredentialFieldActionsProps) {
  const hasCopy = Boolean(copyValue);

  return (
    <div
      className={cn(
        'absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-1',
        mode === 'view' ? CREDENTIAL_HOVER_ACTIONS_CLASS : CREDENTIAL_VISIBLE_ACTIONS_CLASS
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {mode === 'view' ? (
          <motion.div
            key="view-actions"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={actionTransition}
            className="flex items-center gap-1"
          >
            {hasCopy && copyValue && (
              <CopyButton
                valueToCopy={copyValue}
                size="2xs"
                className={iconButtonClassName}
                ariaLabel={`Copy ${copyLabel}`}
              />
            )}
            {onEdit && (
              <EditButton
                size="2xs"
                className={iconButtonClassName}
                aria-label={`Edit ${ariaEntity}`}
                onClick={onEdit}
              />
            )}
            {onDelete && (
              <DeleteButton
                size="2xs"
                className={iconButtonClassName}
                aria-label={`Delete ${ariaEntity}`}
                onClick={onDelete}
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="edit-actions"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={actionTransition}
            className="flex items-center gap-1"
          >
            <button
              type="button"
              aria-label="Save"
              disabled={isSaving}
              onClick={onConfirm}
              className={cn(confirmButtonClassName, isSaving && 'pointer-events-none opacity-50')}
            >
              <RiCheckLine className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Cancel"
              disabled={isSaving}
              onClick={onCancel}
              className={cn(cancelButtonClassName, isSaving && 'pointer-events-none opacity-50')}
            >
              <RiCloseLine className="size-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
