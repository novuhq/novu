import type { Editor as TiptapEditor } from '@tiptap/core';
import { NodeViewProps } from '@tiptap/core';
import { NodeViewWrapper } from '@tiptap/react';
import { JSONSchema7 } from 'json-schema';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { VariableFrom } from '@/components/maily/types';
import { EditVariablePopover } from '@/components/variable/edit-variable-popover';
import { useVariableValidation } from '@/components/variable/hooks/use-variable-validation';
import { validateEnhancedDigestFilters } from '@/components/variable/utils';
import { DIGEST_VARIABLES_ENUM, getDynamicDigestVariable } from '@/components/variable/utils/digest-variables';
import { VariablePill } from '@/components/variable/variable-pill';
import { parseVariable } from '@/utils/liquid';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { resolveRepeatBlockAlias } from '../repeat-block-aliases';

function isCardButtonVariableContext(editor: TiptapEditor): boolean {
  return editor.isActive('cardButton');
}

function setVariablePopoverOpen(editor: TiptapEditor | undefined, open: boolean) {
  if (!editor?.storage?.variable) {
    return;
  }

  editor.storage.variable.popover = open;
  // TipTap bubble menus re-check `shouldShow` on transactions.
  editor.view.dispatch(editor.state.tr.setMeta('variablePopover', open));
}

interface ParsedVariableData {
  name: string;
  filtersArray: string[];
  fullLiquidExpression: string;
  issues: ReturnType<typeof validateEnhancedDigestFilters> | null;
}

function parseVariableWithFallback(variable: string, fallbackName?: string, digestStepId?: string): ParsedVariableData {
  const parsedVariable = parseVariable(variable);

  if (!parsedVariable?.filtersArray) {
    const safeName = fallbackName || '';
    return {
      name: safeName,
      fullLiquidExpression: `{{${safeName}}}`,
      filtersArray: [],
      issues: null,
    };
  }

  let issue: ReturnType<typeof validateEnhancedDigestFilters> = null;
  const { value } = getDynamicDigestVariable({
    type: DIGEST_VARIABLES_ENUM.SENTENCE_SUMMARY,
    digestStepName: digestStepId,
  });

  if (value && value.split('|')[0].trim() === parsedVariable.name) {
    issue = validateEnhancedDigestFilters(parsedVariable.filtersArray);
  }

  return {
    name: parsedVariable.name,
    filtersArray: parsedVariable.filtersArray,
    fullLiquidExpression: parsedVariable.fullLiquidExpression,
    issues: issue,
  };
}

function createLiquidVariable(fullLiquidExpression: string, aliasFor?: string | null): LiquidVariable {
  return {
    name: fullLiquidExpression,
    aliasFor: aliasFor || undefined,
  };
}

// Component for TipTap editor nodes (inline variables in content)
export function NodeVariablePill(
  props: NodeViewProps & {
    digestStepName?: string;
    variables: LiquidVariable[];
    isAllowedVariable: IsAllowedVariable;
    children?: React.ReactNode;
    isPayloadSchemaEnabled?: boolean;
    getSchemaPropertyByKey?: (keyPath: string) => JSONSchema7 | undefined;
    openSchemaDrawer?: (variableName: string) => void;
    handleCreateNewVariable?: (variableName: string) => void;
  }
) {
  const {
    node,
    updateAttributes,
    editor,
    isAllowedVariable,
    deleteNode,
    variables,
    children,
    digestStepName,
    isPayloadSchemaEnabled = false,
    getSchemaPropertyByKey = () => undefined,
    openSchemaDrawer = () => {},
    handleCreateNewVariable = () => {},
  } = props;
  const { id, aliasFor } = node.attrs;
  const [variableValue, setVariableValue] = useState(`{{${id}}}`);
  const [isOpen, setIsOpen] = useState(false);

  const parsedData = useMemo(
    () => parseVariableWithFallback(variableValue, undefined, digestStepName),
    [variableValue, digestStepName]
  );

  const variable = useMemo(
    () => createLiquidVariable(parsedData.fullLiquidExpression, aliasFor),
    [parsedData.fullLiquidExpression, aliasFor]
  );

  const validation = useVariableValidation(
    parsedData.name,
    aliasFor,
    isAllowedVariable,
    getSchemaPropertyByKey,
    isPayloadSchemaEnabled
  );

  const handleUpdate = useCallback(
    (newValue: string) => {
      const newParsedData = parseVariableWithFallback(newValue, undefined, digestStepName);
      const newAliasFor = resolveRepeatBlockAlias(newParsedData.fullLiquidExpression, editor);

      if (newParsedData.fullLiquidExpression) {
        updateAttributes({
          id: newParsedData.fullLiquidExpression,
          aliasFor: newAliasFor,
        });
      }

      setVariableValue(newValue);
    },
    [editor, updateAttributes, digestStepName]
  );

  return (
    <NodeViewWrapper className="react-component mly-inline-block mly-leading-none" draggable="false">
      <EditVariablePopover
        isPayloadSchemaEnabled={isPayloadSchemaEnabled}
        getSchemaPropertyByKey={getSchemaPropertyByKey}
        open={isOpen}
        onOpenChange={setIsOpen}
        variable={variable}
        variables={variables}
        isAllowedVariable={isAllowedVariable}
        onManageSchemaClick={openSchemaDrawer}
        onAddToSchemaClick={handleCreateNewVariable}
        onUpdate={handleUpdate}
        onDeleteClick={() => deleteNode()}
      >
        <VariablePill
          issues={parsedData.issues}
          variableName={parsedData.name}
          filters={parsedData.filtersArray}
          onClick={() => setIsOpen(true)}
          className="-mt-[2px]"
          isNotInSchema={validation.hasError || !validation.isInSchema}
          isPayloadSchemaEnabled={isPayloadSchemaEnabled}
          errorMessage={validation.errorMessage}
        />
      </EditVariablePopover>
      {children}
    </NodeViewWrapper>
  );
}

// Component for bubble menus and button component in email editor
export function BubbleMenuVariablePill({
  isPayloadSchemaEnabled = false,
  digestStepName,
  variableName,
  className,
  from,
  variables,
  isAllowedVariable,
  editor,
  children,
  getSchemaPropertyByKey = () => undefined,
  openSchemaDrawer = () => {},
  handleCreateNewVariable = () => {},
}: {
  isPayloadSchemaEnabled?: boolean;
  digestStepName?: string;
  variableName: string;
  className?: string;
  from?: VariableFrom;
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
  editor?: TiptapEditor;
  children?: React.ReactNode;
  getSchemaPropertyByKey?: (keyPath: string) => JSONSchema7 | undefined;
  openSchemaDrawer?: (variableName: string) => void;
  handleCreateNewVariable?: (variableName: string) => void;
}) {
  const [variableValue, setVariableValue] = useState(`{{${variableName || ''}}}`);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setVariableValue(`{{${variableName || ''}}}`);
  }, [variableName]);

  const parsedData = useMemo(
    () => parseVariableWithFallback(variableValue, variableName || '', digestStepName),
    [variableValue, variableName, digestStepName]
  );

  const aliasFor = useMemo(() => {
    if (editor) {
      return resolveRepeatBlockAlias(parsedData.fullLiquidExpression, editor);
    }

    return null;
  }, [editor, parsedData.fullLiquidExpression]);

  const variable = useMemo(
    () => createLiquidVariable(parsedData.fullLiquidExpression, aliasFor),
    [parsedData.fullLiquidExpression, aliasFor]
  );

  const validation = useVariableValidation(
    parsedData.name,
    aliasFor,
    isAllowedVariable,
    getSchemaPropertyByKey,
    isPayloadSchemaEnabled
  );

  const handleUpdate = useCallback(
    (newValue: string) => {
      if (!editor || from !== VariableFrom.Button) return;

      const newParsedData = parseVariableWithFallback(newValue, variableName || '', digestStepName);
      if (!newParsedData.fullLiquidExpression) return;

      if (isCardButtonVariableContext(editor)) {
        editor.commands.updateCardButtonAttributes({
          label: newParsedData.fullLiquidExpression,
          isLabelVariable: true,
        });
      } else {
        editor.commands.updateButtonAttributes({
          text: newParsedData.fullLiquidExpression,
          isTextVariable: true,
        });
      }

      setVariableValue(newValue);
    },
    [editor, variableName, digestStepName, from]
  );

  const handleDelete = useCallback(() => {
    if (!editor || from !== VariableFrom.Button) return;

    if (isCardButtonVariableContext(editor)) {
      editor.commands.updateCardButtonAttributes({
        label: 'Button',
        isLabelVariable: false,
      });
    } else {
      editor.commands.updateButtonAttributes({
        text: 'Button Text',
        isTextVariable: false,
      });
    }
  }, [editor, from]);

  const handleVariableClick = useCallback(() => {
    setVariablePopoverOpen(editor, true);
    setIsOpen(true);
  }, [editor]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      setVariablePopoverOpen(editor, open);
    },
    [editor]
  );

  const handleManageSchema = useCallback(() => {
    if (editor) {
      setVariablePopoverOpen(editor, false);
      // Unselect the button to hide the bubble menu when opening schema drawer
      editor.commands.setTextSelection(0);
    }

    openSchemaDrawer(parsedData.name);
  }, [editor, openSchemaDrawer, parsedData.name]);

  // Bubble-menu fields (showIf, URL pills, …) are display-only — editing happens in
  // the parent SuggestionInput. Button label pills (`button-variable`) open Configure Variable.
  const canEdit = from !== VariableFrom.Bubble;

  const pill = (
    <VariablePill
      issues={parsedData.issues}
      variableName={parsedData.name}
      filters={parsedData.filtersArray}
      onClick={canEdit ? handleVariableClick : undefined}
      className={className}
      from={from}
      isNotInSchema={validation.hasError || !validation.isInSchema}
      isPayloadSchemaEnabled={isPayloadSchemaEnabled}
      errorMessage={validation.errorMessage}
    />
  );

  if (!canEdit) {
    return (
      <>
        {pill}
        {children}
      </>
    );
  }

  return (
    <>
      <EditVariablePopover
        isPayloadSchemaEnabled={isPayloadSchemaEnabled}
        getSchemaPropertyByKey={getSchemaPropertyByKey}
        open={isOpen}
        onOpenChange={handleOpenChange}
        variable={variable}
        variables={variables}
        isAllowedVariable={isAllowedVariable}
        onManageSchemaClick={handleManageSchema}
        onAddToSchemaClick={handleCreateNewVariable}
        onUpdate={handleUpdate}
        onDeleteClick={handleDelete}
      >
        {pill}
      </EditVariablePopover>
      {children}
    </>
  );
}

// HOC factory for creating TipTap node views
export function createVariableNodeView(variables: LiquidVariable[], isAllowedVariable: IsAllowedVariable) {
  return function VariableView(props: NodeViewProps) {
    return (
      <NodeVariablePill
        {...props}
        variables={variables}
        isAllowedVariable={isAllowedVariable}
        isPayloadSchemaEnabled={false}
      />
    );
  };
}
