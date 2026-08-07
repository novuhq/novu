import { dismissCardActionsMenu } from '@novu/maily-core/extensions';
import type { Editor as TiptapEditor } from '@tiptap/core';
import { NodeViewProps } from '@tiptap/core';
import { NodeViewWrapper } from '@tiptap/react';
import { JSONSchema7 } from 'json-schema';
import { type MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { VariableFrom } from '@/components/maily/types';
import { EditVariablePopover } from '@/components/variable/edit-variable-popover';
import { useVariableValidation } from '@/components/variable/hooks/use-variable-validation';
import { validateEnhancedDigestFilters } from '@/components/variable/utils';
import { DIGEST_VARIABLES_ENUM, getDynamicDigestVariable } from '@/components/variable/utils/digest-variables';
import { VariablePill } from '@/components/variable/variable-pill';
import { parseVariable } from '@/utils/liquid';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { resolveRepeatBlockAlias } from '../repeat-block-aliases';

const CARD_BUTTON_VARIABLE_FIELDS = ['label', 'url'] as const;
const CARD_BUTTON_NODE_NAME = 'cardButton';

/**
 * Replaces (or removes, when `nextExpression` is empty) the `{{ variablePath }}` segment inside the
 * card button field that contains it, preserving surrounding text. Searches the document so it still
 * works when Configure Variable has focus and the card button is no longer node-selected (TipTap's
 * `updateAttributes` / `getAttributes` are selection-scoped and would no-op).
 */
function replaceCardButtonVariableSegment(editor: TiptapEditor, variablePath: string, nextExpression: string): boolean {
  const trimmedPath = variablePath.trim();

  if (!trimmedPath) {
    return false;
  }

  const escapedPath = trimmedPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const segmentRegex = new RegExp(`\\{\\{\\s*${escapedPath}\\s*\\}\\}`);

  let targetPos: number | null = null;
  let nextAttrs: Record<string, unknown> | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (targetPos !== null || node.type.name !== CARD_BUTTON_NODE_NAME) {
      return;
    }

    for (const field of CARD_BUTTON_VARIABLE_FIELDS) {
      const current = node.attrs[field];

      if (typeof current !== 'string' || !segmentRegex.test(current)) {
        continue;
      }

      targetPos = pos;
      nextAttrs = {
        ...node.attrs,
        [field]: current.replace(segmentRegex, nextExpression),
      };

      return;
    }
  });

  if (targetPos === null || !nextAttrs) {
    return false;
  }

  const tr = editor.state.tr.setNodeMarkup(targetPos, undefined, nextAttrs);
  editor.view.dispatch(tr);

  return true;
}

function setVariablePopoverOpen(editor: TiptapEditor | undefined, open: boolean) {
  if (!editor?.storage?.variable) {
    return;
  }

  const keepCardActionsMenu = Boolean(editor.storage.variable.keepCardActionsMenu);
  const isCanvasCardButton = editor.isActive(CARD_BUTTON_NODE_NAME) && !keepCardActionsMenu;

  // Canvas pill Configure: always clear the row selection on close so Actions does not remount.
  // Do not require `isActive('cardButton')` — focus in the popover often drops the node selection
  // while the caret can still sit inside the `cardActions` row (which would show Actions).
  if (!open && !keepCardActionsMenu) {
    dismissCardActionsMenu(editor);
  }

  editor.storage.variable.popover = open;

  // Clear the "keep card Actions bubble mounted" flag on close so it can't leak into the next,
  // unrelated Configure Variable popover. It is re-set (per origin) on the next pill mousedown.
  if (!open) {
    editor.storage.variable.keepCardActionsMenu = false;
  }

  // TipTap bubble menus re-check `shouldShow` on transactions.
  editor.view.dispatch(editor.state.tr.setMeta('variablePopover', open));

  // Opening Configure from a canvas pill: TipTap's BubbleMenu won't hide Actions on a meta-only
  // flip — bounce selection while `popover` is already true so tippy stays dismissed.
  if (open && isCanvasCardButton) {
    const { selection } = editor.state;

    if (selection.node?.type.name === CARD_BUTTON_NODE_NAME) {
      const from = selection.from;
      const after = Math.min(from + selection.node.nodeSize, editor.state.doc.content.size);
      editor.commands.setTextSelection(after);
      editor.commands.setNodeSelection(from);
    }
  }
}

function selectCardButtonFromEvent(editor: TiptapEditor, event: { target: EventTarget | null }): void {
  if (!(event.target instanceof Element)) {
    return;
  }

  const cardButtonEl = event.target.closest('[data-type="cardButton"]');

  if (!cardButtonEl) {
    return;
  }

  try {
    const pos = editor.view.posAtDOM(cardButtonEl, 0);
    const nodeAtPos = editor.state.doc.nodeAt(pos);

    if (nodeAtPos?.type.name === 'cardButton') {
      editor.commands.setNodeSelection(pos);

      return;
    }

    const $pos = editor.state.doc.resolve(pos);

    for (let depth = $pos.depth; depth > 0; depth--) {
      if ($pos.node(depth).type.name === 'cardButton') {
        editor.commands.setNodeSelection($pos.before(depth));

        return;
      }
    }
  } catch {
    // posAtDOM can throw for nodes outside the editor (e.g. Label/URL field pills in Actions).
  }
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

  // Sync closed when Configure Variable is dismissed from outside this React tree (e.g. clicking
  // the card button chrome to switch to the Actions bubble via `closeVariablePopover`).
  useEffect(() => {
    if (!editor) {
      return;
    }

    const onTransaction = () => {
      if (isOpen && !editor.storage?.variable?.popover) {
        setIsOpen(false);
      }
    };

    editor.on('transaction', onTransaction);

    return () => {
      editor.off('transaction', onTransaction);
    };
  }, [editor, isOpen]);

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

      // Card buttons store label/url as plain strings that may mix text and `{{ }}` expressions, so
      // replace only the clicked `{{ variableName }}` segment (in whichever field holds it) and keep
      // the surrounding text — never clobber the whole field. `fullLiquidExpression` is the inner
      // expression (no braces), so wrap it back into `{{ ... }}`.
      const nextExpression = `{{ ${newParsedData.fullLiquidExpression} }}`;
      const replacedCardButton = replaceCardButtonVariableSegment(editor, variableName || '', nextExpression);

      if (!replacedCardButton) {
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

    const removedCardButton = replaceCardButtonVariableSegment(editor, variableName || '', '');

    if (!removedCardButton) {
      editor.commands.updateButtonAttributes({
        text: 'Button Text',
        isTextVariable: false,
      });
    }
  }, [editor, variableName, from]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      setVariablePopoverOpen(editor, open);
    },
    [editor]
  );

  // Toggle: first pill click opens Configure; second closes + unselects (canvas). Stop
  // propagation so the card button chrome handler doesn't treat this as an Actions click.
  const handleVariableClick = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();

      if (isOpen) {
        handleOpenChange(false);

        return;
      }

      if (editor) {
        selectCardButtonFromEvent(editor, event);
      }

      handleOpenChange(true);
    },
    [editor, handleOpenChange, isOpen]
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
        editor={editor}
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
