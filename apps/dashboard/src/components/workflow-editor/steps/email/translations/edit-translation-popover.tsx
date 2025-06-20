import React, { useCallback, useState, useEffect, useId, RefObject, useMemo } from 'react';
import { RiDeleteBin2Line, RiListView, RiQuestionLine, RiErrorWarningLine } from 'react-icons/ri';

import { Popover, PopoverContent, PopoverAnchor } from '@/components/primitives/popover';
import { FormControl, FormItem, FormMessagePure } from '@/components/primitives/form/form';
import { InputRoot, InputPure, InputWrapper } from '@/components/primitives/input';
import { Button } from '@/components/primitives/button';
import { LinkButton } from '@/components/primitives/button-link';
import { ControlInput } from '@/components/primitives/control-input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { TranslateVariable } from '@/components/icons/translate-variable';
import { EscapeKeyManagerPriority } from '@/context/escape-key-manager/priority';
import { useEscapeKeyManager } from '@/context/escape-key-manager/hooks';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { TRANSLATION_KEYS } from './translation-keys';

interface EditTranslationPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  translationKey: string;
  translationValue?: string;
  onUpdate?: (newKey: string, newValue?: string) => void;
  onDelete: () => void;
  triggerRef?: RefObject<HTMLButtonElement>;
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
}

function useTranslationEditor(
  translationKey: string,
  translationValue: string = '',
  onUpdate?: (newKey: string, newValue?: string) => void
) {
  const [editKey, setEditKey] = useState(translationKey);
  const [editValue, setEditValue] = useState(translationValue);

  useEffect(() => {
    setEditKey(translationKey);
    setEditValue(translationValue);
  }, [translationKey, translationValue]);

  const hasChanges = editKey.trim() !== translationKey || editValue !== translationValue;

  const save = useCallback(() => {
    if (hasChanges && onUpdate && editKey.trim() !== '') {
      // TODO: Implement actual save logic/API call here
      console.log('Saving translation:', { key: editKey.trim(), value: editValue });
      onUpdate(editKey.trim(), editValue);
    }
  }, [hasChanges, onUpdate, editKey, editValue]);

  return {
    editKey,
    editValue,
    hasChanges,
    setEditKey,
    setEditValue,
    save,
  };
}

function usePopoverHandlers(
  onOpenChange: (open: boolean) => void,
  onDelete: () => void,
  editor: ReturnType<typeof useTranslationEditor>
) {
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        // Auto-save when closing the popover
        // TODO: Implement actual save logic/API call here
        editor.save();
      }

      onOpenChange(open);
    },
    [onOpenChange, editor]
  );

  const handleClose = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  const handleDelete = useCallback(() => {
    onDelete();
    handleClose();
  }, [onDelete, handleClose]);

  return {
    handleOpenChange,
    handleClose,
    handleDelete,
  };
}

function useTranslationKeys() {
  const [translationKeys, setTranslationKeys] = useState<{ name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with actual API call
    const fetchTranslationKeys = async () => {
      try {
        setIsLoading(true);
        // Simulate API call delay
        await new Promise((resolve) => setTimeout(resolve, 100));

        // For now, use the static keys as if they came from API
        setTranslationKeys(TRANSLATION_KEYS);
      } catch (error) {
        console.error('Failed to fetch translation keys:', error);
        setTranslationKeys([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTranslationKeys();
  }, []);

  return { translationKeys, isLoading };
}

function useTranslationKeyValidation(translationKey: string, availableKeys: { name: string }[]) {
  return useMemo(() => {
    const trimmedKey = translationKey.trim();

    if (!trimmedKey) {
      return {
        hasError: false,
        errorMessage: '',
        isValidKey: false,
      };
    }

    const existingKeys = availableKeys.map((key) => key.name);
    const isValidKey = existingKeys.includes(trimmedKey);

    return {
      hasError: !isValidKey,
      errorMessage: isValidKey ? '' : 'Translation key not found in available keys',
      isValidKey,
    };
  }, [translationKey, availableKeys]);
}

function PopoverHeader({ onDelete }: { onDelete: () => void }) {
  return (
    <div className="bg-bg-weak border-b border-b-neutral-100 px-1.5 py-1">
      <div className="flex items-center justify-between">
        <span className="text-subheading-2xs text-text-soft">CONFIGURE TRANSLATION</span>
        <Button variant="secondary" mode="ghost" className="h-5 p-1" onClick={onDelete}>
          <RiDeleteBin2Line className="size-3.5 text-neutral-400" />
        </Button>
      </div>
    </div>
  );
}

function TranslationInput({
  value,
  onChange,
  onKeyDown,
  hasError,
  errorMessage,
  onAddTranslationKey,
  isLoading,
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  hasError: boolean;
  errorMessage: string;
  onAddTranslationKey: () => void;
  isLoading: boolean;
}) {
  const handleManageTranslations = useCallback(() => {
    // TODO: Add navigation to translations management page
    console.log('Navigate to translations management');
  }, []);

  return (
    <FormItem>
      <FormControl>
        <div className="space-y-1">
          <div className="flex w-full items-center justify-between gap-1">
            <label className="text-text-sub text-label-xs flex items-center gap-1">
              Translation key
              <Tooltip>
                <TooltipTrigger className="relative cursor-pointer">
                  <RiQuestionLine className="text-text-soft size-4" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-label-xs">
                    A unique identifier for this translation. Use dot notation for nested keys (e.g., "welcome.title" or
                    "buttons.submit").
                  </p>
                </TooltipContent>
              </Tooltip>
            </label>
            <LinkButton
              variant="gray"
              size="sm"
              className="text-label-2xs text-xs"
              leadingIcon={RiListView}
              onClick={handleManageTranslations}
            >
              View & manage translations ↗
            </LinkButton>
          </div>
          <InputRoot size="2xs" hasError={hasError && !isLoading}>
            <InputWrapper>
              <TranslateVariable className="h-4 w-4 shrink-0 text-gray-500" />
              <InputPure
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="text-xs"
                placeholder={isLoading ? 'Loading translation keys...' : 'Enter translation key'}
                onKeyDown={onKeyDown}
                disabled={isLoading}
              />
            </InputWrapper>
          </InputRoot>
          {hasError && !isLoading && (
            <FormMessagePure hasError={true} className="text-label-2xs mb-0.5 mt-0.5">
              <RiErrorWarningLine className="h-3 w-3" />
              {errorMessage}{' '}
              <LinkButton variant="modifiable" size="sm" className="text-label-2xs" onClick={onAddTranslationKey}>
                <span className="underline">Add translation key ↗</span>
              </LinkButton>
            </FormMessagePure>
          )}
        </div>
      </FormControl>
    </FormItem>
  );
}

function TranslationValueInput({
  value,
  onChange,
  variables,
  isAllowedVariable,
}: {
  value: string;
  onChange: (value: string) => void;
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
}) {
  return (
    <FormItem>
      <FormControl>
        <div className="space-y-1">
          <label className="text-text-sub text-label-xs flex items-center gap-1">
            Value
            <Tooltip>
              <TooltipTrigger className="relative cursor-pointer">
                <RiQuestionLine className="text-text-soft size-4" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-label-xs">
                  The translated text content. Use {'{{'} to insert dynamic variables from your workflow payload or step
                  data.
                </p>
              </TooltipContent>
            </Tooltip>
          </label>
          <InputRoot size="2xs" className="min-h-[4rem] overflow-visible">
            <ControlInput
              value={value}
              onChange={onChange}
              variables={variables}
              isAllowedVariable={isAllowedVariable}
              placeholder="Type your translation text here."
              multiline={true}
              size="2xs"
              className="resize-none [&_.cm-scroller]:max-h-[8rem] [&_.cm-scroller]:overflow-y-auto"
            />
          </InputRoot>
        </div>
      </FormControl>
    </FormItem>
  );
}

export const EditTranslationPopover: React.FC<EditTranslationPopoverProps> = ({
  open,
  onOpenChange,
  translationKey,
  translationValue = '',
  onUpdate,
  onDelete,
  triggerRef,
  variables,
  isAllowedVariable,
}) => {
  const id = useId();
  const editor = useTranslationEditor(translationKey, translationValue, onUpdate);
  const handlers = usePopoverHandlers(onOpenChange, onDelete, editor);
  const { translationKeys, isLoading } = useTranslationKeys();
  const validation = useTranslationKeyValidation(editor.editKey, translationKeys);

  useEscapeKeyManager(id, handlers.handleClose, EscapeKeyManagerPriority.POPOVER, open);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handlers.handleClose();
      }
    },
    [handlers]
  );

  const handleAddTranslationKey = useCallback(async () => {
    try {
      // TODO: Implement actual API call to add translation key
      console.log('Adding translation key:', editor.editKey);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      // TODO: Refresh translation keys after successful addition
      // For now, just close the popover
      handlers.handleClose();
    } catch (error) {
      console.error('Failed to add translation key:', error);
    }
  }, [editor.editKey, handlers]);

  const virtualAnchor = triggerRef?.current
    ? { getBoundingClientRect: () => triggerRef.current!.getBoundingClientRect() }
    : undefined;

  return (
    <Popover open={open} onOpenChange={handlers.handleOpenChange}>
      {virtualAnchor && <PopoverAnchor virtualRef={{ current: virtualAnchor }} />}
      <PopoverContent
        className="w-[460px] overflow-visible p-0 [&[data-state=closed]]:animate-none [&[data-state=open]]:animate-none"
        align="start"
        side="bottom"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handlers.handleClose();
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <PopoverHeader onDelete={handlers.handleDelete} />

          <div className="space-y-3 p-2">
            <TranslationInput
              value={editor.editKey}
              onChange={editor.setEditKey}
              onKeyDown={handleKeyDown}
              hasError={validation.hasError}
              errorMessage={validation.errorMessage}
              onAddTranslationKey={handleAddTranslationKey}
              isLoading={isLoading}
            />

            <TranslationValueInput
              value={editor.editValue}
              onChange={editor.setEditValue}
              variables={variables}
              isAllowedVariable={isAllowedVariable}
            />
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
};
