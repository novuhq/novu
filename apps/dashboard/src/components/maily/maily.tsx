import { Editor as MailyEditor } from '@maily-to/core';
import { BlockGroupItem } from '@maily-to/core/blocks';
import { Variable } from '@maily-to/core/extensions';
import type { Editor, NodeViewProps, Editor as TiptapEditor } from '@tiptap/core';
import { Editor as TiptapEditorReact } from '@tiptap/react';
import { ForwardRefExoticComponent, HTMLAttributes, useCallback, useMemo, useRef } from 'react';
import { useRemoveGrammarly } from '@/hooks/use-remove-grammarly';
import { TranslationKey } from '@/types/translations';
import { EnhancedParsedVariables, IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { cn } from '@/utils/ui';
import { createExtensions, DEFAULT_EDITOR_CONFIG, MAILY_EMAIL_WIDTH } from './maily-config';
import { RepeatMenuDescription } from './repeat-menu-description';
import { VariableFrom } from './types';
import { calculateVariables } from './variables';
import { MailyVariablesListView } from './views/maily-variables-list-view';
import { createVariableNodeView as defaultCreateVariableNodeView } from './views/variable-view';

type MailyProps = HTMLAttributes<HTMLDivElement> & {
  value: string;
  onChange?: (value: string) => void;
  className?: string;
  children?: React.ReactNode;
  variables?: EnhancedParsedVariables;
  blocks?: BlockGroupItem[];
  addDigestVariables?: boolean;
  onCreateNewVariable?: (variable: string) => Promise<void>;
  onCreateNewTranslationKey?: (translationKey: string) => Promise<void>;
  isPayloadSchemaEnabled?: boolean;
  isTranslationEnabled?: boolean;
  translationKeys?: TranslationKey[];
  variableSuggestionsPopover?: ForwardRefExoticComponent<{
    items: Variable[];
    onSelectItem: (item: Variable) => void;
  }>;
  renderVariable?: (opts: {
    variable: Variable;
    fallback?: string;
    editor: Editor;
    from: 'content-variable' | 'bubble-variable' | 'button-variable';
  }) => JSX.Element | null;
  createVariableNodeView?: (
    variables: LiquidVariable[],
    isAllowedVariable: IsAllowedVariable
  ) => (props: NodeViewProps) => JSX.Element;
};

/**
 * The Maily component is a wrapper around the MailyEditor component that adds variable pill support.
 * Note: Please keep it pure and don't add any additional logic to it, for example workflows related logic.
 */
export const Maily = ({
  value,
  onChange,
  className,
  children,
  variables = {
    primitives: [],
    arrays: [],
    namespaces: [],
    enhancedVariables: [],
    variables: [],
    isAllowedVariable: () => false,
  },
  blocks,
  isPayloadSchemaEnabled,
  isTranslationEnabled,
  addDigestVariables,
  onCreateNewVariable = () => Promise.resolve(),
  onCreateNewTranslationKey = () => Promise.resolve(),
  translationKeys,
  variableSuggestionsPopover = MailyVariablesListView,
  renderVariable = () => null,
  createVariableNodeView = defaultCreateVariableNodeView,
  ...rest
}: MailyProps) => {
  const primitives = useMemo(
    () => variables?.primitives.map((v) => ({ name: v.name, required: false })) ?? [],
    [variables?.primitives]
  );
  const arrays = useMemo(
    () => variables?.arrays.map((v) => ({ name: v.name, required: false })) ?? [],
    [variables?.arrays]
  );
  const namespaces = useMemo(
    () => variables?.namespaces.map((v) => ({ name: v.name, required: false })) ?? [],
    [variables?.namespaces]
  );

  const editorParentRef = useRemoveGrammarly<HTMLDivElement>();

  const handleCalculateVariables = useCallback(
    ({ query, editor, from }: { query: string; editor: TiptapEditor; from: VariableFrom }) => {
      return calculateVariables({
        query,
        editor,
        from,
        primitives,
        arrays,
        namespaces,
        isAllowedVariable: variables?.isAllowedVariable ?? (() => false),
        addDigestVariables,
        isPayloadSchemaEnabled,
        isTranslationEnabled,
      });
    },
    [
      primitives,
      arrays,
      namespaces,
      variables?.isAllowedVariable,
      addDigestVariables,
      isPayloadSchemaEnabled,
      isTranslationEnabled,
    ]
  );

  const extensions = useMemo(
    () =>
      createExtensions({
        handleCalculateVariables,
        parsedVariables: variables,
        blocks: blocks ?? [],
        onCreateNewVariable,
        isPayloadSchemaEnabled,
        isTranslationEnabled,
        translationKeys,
        onCreateNewTranslationKey,
        variableSuggestionsPopover,
        renderVariable,
        createVariableNodeView,
      }),
    [
      handleCalculateVariables,
      variables,
      blocks,
      isPayloadSchemaEnabled,
      onCreateNewVariable,
      isTranslationEnabled,
      translationKeys,
      onCreateNewTranslationKey,
      variableSuggestionsPopover,
      renderVariable,
      createVariableNodeView,
    ]
  );

  /*
   * Override Maily tippy box styles as a temporary solution.
   * Note: These styles affect both the bubble menu and block manipulation buttons (drag & drop, add).
   * TODO: Request Maily to expose these components or provide specific CSS selectors for individual targeting.
   */
  const overrideTippyBoxStyles = () => (
    <style>
      {`
          [data-tippy-root] {
            z-index: 50 !important;
          }
          .tippy-box {
            padding-right: 20px;
            pointer-events: auto;

            .mly-cursor-grab {
              background-color: #fff;
              border-radius: 4px;
              box-shadow: 0px 0px 2px 0px rgba(0, 0, 0, 0.04), 0px 1px 2px 0px rgba(0, 0, 0, 0.02);
              border-radius: 4px;
              margin: 2px;
            }
          }
        `}
    </style>
  );

  const repeatMenuConfig = useMemo(() => {
    return {
      description: (editor: TiptapEditorReact) => <RepeatMenuDescription editor={editor} />,
    };
  }, []);

  const onUpdate = useCallback(
    (editor: TiptapEditorReact) => {
      if (onChange) {
        onChange(JSON.stringify(editor.getJSON()));
      }
    },
    [onChange]
  );

  return (
    <div className="relative h-full flex-1 overflow-y-auto bg-neutral-50 px-16 pt-8">
      {overrideTippyBoxStyles()}
      <div
        ref={editorParentRef}
        className={cn(
          `shadow-xs mx-auto flex min-h-full max-w-[${MAILY_EMAIL_WIDTH}px] flex-col items-start rounded-lg bg-white [&_a]:pointer-events-none`,
          className
        )}
        data-gramm={false}
        data-gramm_editor={false}
        data-enable-grammarly="false"
        aria-autocomplete="none"
        aria-multiline={false}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        {...rest}
      >
        <MailyEditor
          config={DEFAULT_EDITOR_CONFIG}
          blocks={blocks}
          extensions={extensions}
          contentJson={value ? JSON.parse(value) : undefined}
          onUpdate={onUpdate}
          repeatMenuConfig={repeatMenuConfig}
        />
      </div>
      {children}
    </div>
  );
};
