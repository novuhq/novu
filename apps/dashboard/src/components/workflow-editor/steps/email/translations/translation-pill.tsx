import React, { useMemo, useRef, useState } from 'react';
import { VariableIcon } from '@/components/variable/components/variable-icon';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useFetchTranslationKeys } from '@/hooks/use-fetch-translation-keys';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { useTranslationValidation } from '@/hooks/use-translation-validation';
import { cn } from '@/utils/ui';
import { EditTranslationPopover } from './edit-translation-popover/edit-translation-popover';
import { TranslationTooltip } from './translation-tooltip';

interface TranslationPillProps {
  decoratorKey: string; // "common.submit"
  onUpdate?: (key: string) => void;
  onDelete?: () => void;
}

export const TranslationPill: React.FC<TranslationPillProps> = ({ decoratorKey, onUpdate, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | undefined>();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { step, digestStepBeforeCurrent, workflow } = useWorkflow();
  const { variables, isAllowedVariable } = useParseVariables(step?.variables, digestStepBeforeCurrent?.stepId);

  // Fetch translation keys to validate if the current key exists
  const { translationKeys, isLoading: isTranslationKeysLoading } = useFetchTranslationKeys({
    workflowId: workflow?._id || '',
    enabled: !!workflow?._id,
  });

  const displayTranslationKey = useMemo(() => {
    if (!decoratorKey) return '';
    const keyParts = decoratorKey.split('.');

    return keyParts.length >= 2 ? '..' + keyParts.slice(-2).join('.') : decoratorKey;
  }, [decoratorKey]);

  const validation = useTranslationValidation({
    translationKey: decoratorKey,
    availableKeys: translationKeys,
    isLoading: isTranslationKeysLoading,
    allowEmpty: false, // Pills should always have a key
  });

  const hasError = validation.hasError;
  const errorMessage = validation.errorMessage;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Calculate position for popover
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopoverPosition({
        top: rect.bottom + 4, // Small offset below the button
        left: rect.left,
      });
    }

    setIsOpen(true);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Calculate position for popover
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopoverPosition({
        top: rect.bottom + 4, // Small offset below the button
        left: rect.left,
      });
    }

    setIsOpen(true);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      setIsOpen(false);
    }
  };

  return (
    <>
      <TranslationTooltip hasError={hasError} errorMessage={errorMessage}>
        <button
          type="button"
          contentEditable={false}
          className={cn(
            'bg-bg-white border-stroke-soft font-code',
            'relative m-0 box-border inline-flex cursor-pointer items-center gap-1 rounded-lg border px-1.5 py-px align-middle font-medium leading-[inherit] text-inherit',
            'text-text-sub h-[max(18px,calc(1em+2px))] text-[max(12px,calc(1em-3px))]',
            { 'hover:bg-error-base/2.5': hasError }
          )}
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          ref={buttonRef}
        >
          <VariableIcon variableName={decoratorKey} hasError={hasError} context="translations" />
          <span className="text-text-sub max-w-[24ch] truncate leading-[1.2] antialiased" title={displayTranslationKey}>
            {displayTranslationKey}
          </span>
        </button>
      </TranslationTooltip>

      <EditTranslationPopover
        open={isOpen}
        onOpenChange={setIsOpen}
        translationKey={decoratorKey}
        onDelete={handleDelete}
        onReplaceKey={onUpdate}
        position={popoverPosition}
        variables={variables}
        isAllowedVariable={isAllowedVariable}
        workflowId={workflow?._id || ''}
      />
    </>
  );
};
