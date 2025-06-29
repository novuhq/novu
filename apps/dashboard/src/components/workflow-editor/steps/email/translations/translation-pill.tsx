import React, { useMemo, useState, useRef } from 'react';
import { cn } from '@/utils/ui';
import { TranslateVariable } from '@/components/icons/translate-variable';
import { EditTranslationPopover } from './edit-translation-popover';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useParseVariables } from '@/hooks/use-parse-variables';

interface TranslationPillProps {
  decoratorKey: string; // "common.submit"
  onUpdate?: (newKey: string) => void;
  onDelete?: () => void;
}

export const TranslationPill: React.FC<TranslationPillProps> = ({ decoratorKey, onUpdate, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { step, digestStepBeforeCurrent } = useWorkflow();
  const { variables, isAllowedVariable } = useParseVariables(step?.variables, digestStepBeforeCurrent?.stepId);

  const displayTranslationKey = useMemo(() => {
    if (!decoratorKey) return '';
    const keyParts = decoratorKey.split('.');

    return keyParts.length >= 2 ? '..' + keyParts.slice(-2).join('.') : decoratorKey;
  }, [decoratorKey]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      setIsOpen(false);
    }
  };

  const handleUpdate = (newKey: string) => {
    if (onUpdate) {
      onUpdate(newKey);
      setIsOpen(false);
    }
  };

  return (
    <>
      <button
        type="button"
        contentEditable={false}
        className={cn(
          'bg-bg-white border-stroke-soft font-code',
          'relative m-0 box-border inline-flex cursor-pointer items-center gap-1 rounded-lg border px-1.5 py-px align-middle font-medium leading-[inherit] text-inherit',
          'text-text-sub h-[max(18px,calc(1em+2px))] text-[max(12px,calc(1em-3px))]'
        )}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        ref={buttonRef}
      >
        <TranslateVariable />
        <span className="text-text-sub max-w-[24ch] truncate leading-[1.2] antialiased" title={displayTranslationKey}>
          {displayTranslationKey}
        </span>
      </button>

      <EditTranslationPopover
        open={isOpen}
        onOpenChange={setIsOpen}
        translationKey={decoratorKey}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        triggerRef={buttonRef}
        variables={variables}
        isAllowedVariable={isAllowedVariable}
      />
    </>
  );
};
