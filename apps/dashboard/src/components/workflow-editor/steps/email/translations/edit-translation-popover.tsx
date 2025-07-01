import React, { useCallback, useState, useEffect, useId, RefObject, useMemo, useRef } from 'react';
import { RiDeleteBin2Line, RiListView, RiQuestionLine, RiErrorWarningLine } from 'react-icons/ri';

import { Popover, PopoverContent, PopoverAnchor } from '@/components/primitives/popover';
import { FormControl, FormItem, FormMessagePure } from '@/components/primitives/form/form';
import { InputRoot, InputPure, InputWrapper } from '@/components/primitives/input';
import { Button } from '@/components/primitives/button';
import { LinkButton } from '@/components/primitives/button-link';
import { ControlInput } from '@/components/primitives/control-input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { TranslateVariableIcon } from '@/components/icons/translate-variable';
import { EscapeKeyManagerPriority } from '@/context/escape-key-manager/priority';
import { useEscapeKeyManager } from '@/context/escape-key-manager/hooks';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { useFetchTranslationKeys } from '@/hooks/use-fetch-translation-keys';
import { useCreateTranslationKey } from '@/hooks/use-create-translation-key';
import { useUpdateTranslationValue } from '@/hooks/use-update-translation-value';
import { buildRoute, ROUTES } from '@/utils/routes';
import { useParams } from 'react-router-dom';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';

interface EditTranslationPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  translationKey: string;
  translationValue?: string;
  onDelete: () => void;
  onReplaceKey?: (newKey: string) => void;
  triggerRef?: RefObject<HTMLButtonElement>;
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
  workflowId: string;
}

const getTranslationValue = (content: Record<string, unknown> | undefined, key: string): string => {
  if (!content || !key) return '';

  const keys = key.split('.');
  let current: any = content;

  for (const keyPart of keys) {
    if (current && typeof current === 'object' && keyPart in current) {
      current = current[keyPart];
    } else {
      return '';
    }
  }

  return typeof current === 'string' ? current : '';
};

const useTranslationEditor = (
  initialKey: string,
  initialValue: string,
  workflowId: string,
  translationData: any,
  onReplaceKey?: (newKey: string) => void
) => {
  const [editKey, setEditKey] = useState(initialKey);
  const [editValue, setEditValue] = useState(initialValue);
  const updateTranslationValue = useUpdateTranslationValue();
  const lastSavedValueRef = useRef<string>('');
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  const actualTranslationValue = useMemo(() => {
    return getTranslationValue(translationData?.content, editKey.trim());
  }, [translationData?.content, editKey]);

  useEffect(() => {
    setEditKey(initialKey);
  }, [initialKey]);

  useEffect(() => {
    const newValue = actualTranslationValue || initialValue;
    setEditValue(newValue);
    lastSavedValueRef.current = newValue;
  }, [actualTranslationValue, initialValue]);

  useEffect(() => {
    if (editKey.trim() !== initialKey && onReplaceKey) {
      onReplaceKey(editKey.trim());
    }
  }, [editKey, initialKey, onReplaceKey]);

  // Debounced save effect - triggers when editValue changes
  useEffect(() => {
    const trimmedKey = editKey.trim();

    if (editValue !== lastSavedValueRef.current && trimmedKey) {
      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Set new timeout for debounced save
      debounceTimeoutRef.current = setTimeout(() => {
        updateTranslationValue.mutate({
          workflowId,
          translationKey: trimmedKey,
          translationValue: editValue,
        });
        lastSavedValueRef.current = editValue;
      }, 500); // 500ms debounce
    }

    // Cleanup timeout on unmount
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [editValue, editKey, workflowId, updateTranslationValue]);

  return {
    editKey,
    editValue,
    setEditKey,
    setEditValue,
    isSaving: updateTranslationValue.isPending,
  };
};

const useTranslationValidation = (translationKey: string, availableKeys: { name: string }[]) => {
  return useMemo(() => {
    const trimmedKey = translationKey.trim();

    if (!trimmedKey) {
      return { hasError: false, errorMessage: '', isValidKey: false };
    }

    const existingKeys = availableKeys.map((key) => key.name);
    const isValidKey = existingKeys.includes(trimmedKey);

    return {
      hasError: !isValidKey,
      errorMessage: isValidKey ? '' : 'Translation key not found in available keys',
      isValidKey,
    };
  }, [translationKey, availableKeys]);
};

const useVirtualAnchor = (open: boolean, triggerRef?: RefObject<HTMLButtonElement>) => {
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (open && triggerRef?.current && !anchorRect) {
      setAnchorRect(triggerRef.current.getBoundingClientRect());
    } else if (!open) {
      setAnchorRect(null);
    }
  }, [open, triggerRef, anchorRect]);

  return useMemo(() => {
    if (!anchorRect) return null;
    return { getBoundingClientRect: () => anchorRect };
  }, [anchorRect]);
};

const PopoverHeader = ({ onDelete }: { onDelete: () => void }) => (
  <div className="bg-bg-weak border-b border-b-neutral-100 px-1.5 py-1">
    <div className="flex items-center justify-between">
      <span className="text-subheading-2xs text-text-soft">CONFIGURE TRANSLATION</span>
      <Button variant="secondary" mode="ghost" className="h-5 p-1" onClick={onDelete}>
        <RiDeleteBin2Line className="size-3.5 text-neutral-400" />
      </Button>
    </div>
  </div>
);

const TranslationKeyInput = ({
  value,
  onChange,
  onKeyDown,
  hasError,
  errorMessage,
  onAddTranslationKey,
  isLoading,
  isCreatingKey,
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  hasError: boolean;
  errorMessage: string;
  onAddTranslationKey: () => void;
  isLoading: boolean;
  isCreatingKey: boolean;
}) => {
  const { environmentSlug } = useParams();
  const { workflow } = useWorkflow();

  const translationsUrl = buildRoute(ROUTES.TRANSLATIONS, {
    environmentSlug: environmentSlug ?? '',
  });

  const translationsUrlWithSearch = workflow?.name
    ? `${translationsUrl}?query=${encodeURIComponent(workflow.name)}`
    : translationsUrl;

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
              onClick={() => window.open(translationsUrlWithSearch, '_blank')}
            >
              View & manage translations ↗
            </LinkButton>
          </div>
          <InputRoot size="2xs" hasError={hasError && !isLoading}>
            <InputWrapper>
              <TranslateVariableIcon className="h-4 w-4 shrink-0 text-gray-500" />
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
              <LinkButton
                variant="modifiable"
                size="sm"
                className="text-label-2xs"
                onClick={onAddTranslationKey}
                disabled={isCreatingKey}
              >
                <span className="underline">{isCreatingKey ? 'Adding...' : 'Add translation key ↗'}</span>
              </LinkButton>
            </FormMessagePure>
          )}
        </div>
      </FormControl>
    </FormItem>
  );
};

const TranslationValueInput = ({
  value,
  onChange,
  variables,
  isAllowedVariable,
  isSaving,
}: {
  value: string;
  onChange: (value: string) => void;
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
  isSaving: boolean;
}) => (
  <FormItem>
    <FormControl>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
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
          {isSaving && (
            <span className="text-text-soft text-label-2xs flex items-center gap-1">
              <div className="h-2 w-2 animate-spin rounded-full border border-gray-300 border-t-gray-600" />
              Saving...
            </span>
          )}
        </div>
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

export const EditTranslationPopover: React.FC<EditTranslationPopoverProps> = ({
  open,
  onOpenChange,
  translationKey,
  translationValue = '',
  onDelete,
  onReplaceKey,
  triggerRef,
  variables,
  isAllowedVariable,
  workflowId,
}) => {
  const id = useId();
  const { translationKeys, isLoading, translationData } = useFetchTranslationKeys({
    workflowId,
    enabled: open,
  });

  const editor = useTranslationEditor(translationKey, translationValue, workflowId, translationData, onReplaceKey);
  const createTranslationKeyMutation = useCreateTranslationKey();
  const validation = useTranslationValidation(editor.editKey, translationKeys);
  const virtualAnchor = useVirtualAnchor(open, triggerRef);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleDelete = useCallback(() => {
    onDelete();
    handleClose();
  }, [onDelete, handleClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    },
    [handleClose]
  );

  const handleAddTranslationKey = useCallback(async () => {
    const newKey = editor.editKey.trim();
    const oldKey = translationKey;

    const result = await createTranslationKeyMutation.mutateAsync({
      workflowId,
      translationKey: newKey,
      defaultValue: editor.editValue || `[${newKey}]`,
    });

    if (result) {
      if (onReplaceKey && newKey !== oldKey) {
        onReplaceKey(newKey);
      }

      handleClose();
    }
  }, [
    editor.editKey,
    editor.editValue,
    workflowId,
    createTranslationKeyMutation,
    handleClose,
    translationKey,
    onReplaceKey,
  ]);

  useEscapeKeyManager(id, handleClose, EscapeKeyManagerPriority.POPOVER, open);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {virtualAnchor && <PopoverAnchor virtualRef={{ current: virtualAnchor }} />}
      <PopoverContent
        className="w-[460px] overflow-visible p-0 [&[data-state=closed]]:animate-none [&[data-state=open]]:animate-none"
        align="start"
        side="bottom"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <PopoverHeader onDelete={handleDelete} />

          <div className="space-y-3 p-2">
            <TranslationKeyInput
              value={editor.editKey}
              onChange={editor.setEditKey}
              onKeyDown={handleKeyDown}
              hasError={validation.hasError}
              errorMessage={validation.errorMessage}
              onAddTranslationKey={handleAddTranslationKey}
              isLoading={isLoading}
              isCreatingKey={createTranslationKeyMutation.isPending}
            />

            <TranslationValueInput
              value={editor.editValue}
              onChange={editor.setEditValue}
              variables={variables}
              isAllowedVariable={isAllowedVariable}
              isSaving={editor.isSaving}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
