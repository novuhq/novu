import { DEFAULT_LOCALE } from '@novu/shared';
import React, { useCallback, useId, useState } from 'react';
import { RiDeleteBin2Line, RiErrorWarningLine, RiListView, RiQuestionLine } from 'react-icons/ri';
import { TranslateVariableIcon } from '@/components/icons/translate-variable';
import { Button } from '@/components/primitives/button';
import { LinkButton } from '@/components/primitives/button-link';
import { FormControl, FormItem, FormMessagePure } from '@/components/primitives/form/form';
import { InputPure, InputRoot, InputWrapper } from '@/components/primitives/input';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/primitives/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { TranslationDrawer } from '@/components/translations/translation-drawer/translation-drawer';
import { ControlInput } from '@/components/workflow-editor/control-input';
import { useEscapeKeyManager } from '@/context/escape-key-manager/hooks';
import { EscapeKeyManagerPriority } from '@/context/escape-key-manager/priority';
import { useFetchTranslationKeys } from '@/hooks/use-fetch-translation-keys';
import { useUpdateTranslationValue } from '@/hooks/use-update-translation-value';
import { LocalizationResourceEnum } from '@/types/translations';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { useTranslationEditor } from './use-translation-editor';
import { useTranslationForm } from './use-translation-form';
import { useVirtualAnchor } from './use-virtual-anchor';

interface EditTranslationPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  translationKey: string;
  translationValue?: string;
  onDelete: () => void;
  onReplaceKey?: (newKey: string) => void;
  position?: { top: number; left: number };
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
  workflowId: string;
}

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
  workflowId,
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  hasError: boolean;
  errorMessage: string;
  onAddTranslationKey: () => void;
  isLoading: boolean;
  isCreatingKey: boolean;
  workflowId: string;
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleManageTranslationsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDrawerOpen(true);
  };

  return (
    <FormItem>
      <FormControl>
        <div className="space-y-1">
          <div className="flex w-full items-center justify-between gap-1">
            <label className="text-text-sub text-label-xs flex items-center gap-1">
              Translation key
              <span className="text-text-soft bg-neutral-alpha-50 text-label-2xs rounded px-1.5 py-0.5 font-medium">
                {DEFAULT_LOCALE}
              </span>
              <Tooltip>
                <TooltipTrigger className="relative cursor-pointer">
                  <RiQuestionLine className="text-text-soft size-4" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-label-xs">
                    A unique identifier for this translation. Keys are added to the default language ({DEFAULT_LOCALE}).
                    Use dot notation for nested keys (e.g., "welcome.title" or "buttons.submit").
                  </p>
                </TooltipContent>
              </Tooltip>
            </label>
            <LinkButton
              variant="gray"
              size="sm"
              className="text-label-2xs text-xs"
              leadingIcon={RiListView}
              onClick={handleManageTranslationsClick}
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

      <TranslationDrawer
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        resourceType={LocalizationResourceEnum.WORKFLOW}
        resourceId={workflowId}
      />
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
  position,
  variables,
  isAllowedVariable,
  workflowId,
}) => {
  const id = useId();
  const { translationKeys, isLoading, translationData } = useFetchTranslationKeys({
    workflowId,
    enabled: open,
  });

  const updateTranslationValue = useUpdateTranslationValue();
  const editor = useTranslationEditor(
    translationKey,
    translationValue,
    translationData || null,
    workflowId,
    updateTranslationValue,
    onReplaceKey
  );
  const virtualAnchor = useVirtualAnchor(position);

  const handleClose = useCallback(() => {
    // Save any pending changes and trigger key replacement before closing
    const trimmedKey = editor.editKey.trim();

    // Save the translation value if it changed and we have a valid key
    if (editor.editValue !== editor.lastSavedValueRef.current && trimmedKey) {
      // Clear any pending debounced save
      if (editor.debounceTimeoutRef.current) {
        clearTimeout(editor.debounceTimeoutRef.current);
        editor.debounceTimeoutRef.current = undefined;
      }

      updateTranslationValue.mutate({
        workflowId,
        translationKey: trimmedKey,
        translationValue: editor.editValue,
      });
      editor.lastSavedValueRef.current = editor.editValue;
    }

    // Replace the key in the editor if it was manually edited and changed
    if (editor.hasUserEditedKey && onReplaceKey && trimmedKey && trimmedKey !== editor.initialKeyOnOpen) {
      onReplaceKey(trimmedKey);
    }

    onOpenChange(false);
  }, [editor, workflowId, updateTranslationValue, onReplaceKey, onOpenChange]);

  const form = useTranslationForm(
    editor.editKey,
    editor.editValue,
    workflowId,
    translationKey,
    translationKeys,
    onReplaceKey,
    handleClose
  );

  // Combined function to save value and replace key immediately
  const saveAndReplaceImmediately = useCallback(() => {
    const trimmedKey = editor.editKey.trim();

    // Save the translation value if it changed and we have a valid key
    if (editor.editValue !== editor.lastSavedValueRef.current && trimmedKey) {
      // Clear any pending debounced save
      if (editor.debounceTimeoutRef.current) {
        clearTimeout(editor.debounceTimeoutRef.current);
        editor.debounceTimeoutRef.current = undefined;
      }

      updateTranslationValue.mutate({
        workflowId,
        translationKey: trimmedKey,
        translationValue: editor.editValue,
      });
      editor.lastSavedValueRef.current = editor.editValue;
    }

    // Replace the key in the editor if it was manually edited and changed
    if (editor.hasUserEditedKey && onReplaceKey && trimmedKey && trimmedKey !== editor.initialKeyOnOpen) {
      onReplaceKey(trimmedKey);
    }
  }, [editor, workflowId, updateTranslationValue, onReplaceKey]);

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

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // Save any pending changes and trigger key replacement before closing
        saveAndReplaceImmediately();
      }

      onOpenChange(newOpen);
    },
    [onOpenChange, saveAndReplaceImmediately]
  );

  useEscapeKeyManager(id, handleClose, EscapeKeyManagerPriority.POPOVER, open);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      {virtualAnchor && <PopoverAnchor virtualRef={{ current: virtualAnchor }} />}
      <PopoverContent
        className="w-[460px] overflow-visible p-0"
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
              hasError={form.validation.hasError}
              errorMessage={form.validation.errorMessage}
              onAddTranslationKey={form.handleAddTranslationKey}
              isLoading={isLoading}
              isCreatingKey={form.isCreatingKey}
              workflowId={workflowId}
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
