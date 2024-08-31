import { ChangeEvent, FocusEvent, useEffect, useState } from 'react';
import { NodeViewContent, NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import {
  AUTOCOMPLETE_CLOSE_TAG,
  AUTOCOMPLETE_OPEN_TAG,
  AUTOCOMPLETE_REGEX,
  LIQUID_FILTER_CHAR,
  VariableErrorCode,
} from '../constants';
import { useInputAutocompleteContext } from '../context';

export function Variable({ editor, node, updateAttributes, ...props }: NodeViewProps) {
  const [errorCode, setErrorCode] = useState<VariableErrorCode | undefined>();

  const { variablesSet } = useInputAutocompleteContext();

  const updateVariableAttributes = (label: string, newErrorCode?: VariableErrorCode) => {
    updateAttributes({ label, error: newErrorCode });
    setErrorCode(newErrorCode);
  };

  // Initialize error state after validating variable
  useEffect(() => {
    if (variablesSet && variablesSet.size > 0 && !getValidatedVariable(node.attrs.label, variablesSet)) {
      setErrorCode(VariableErrorCode.INVALID_NAME);
    }
  }, [node.attrs.label, variablesSet]);

  // In case of an invalid variable input, set content to be the label variable which will include the whole invalid variable
  const renderedNodeViewContent = !node.attrs.label.includes(AUTOCOMPLETE_OPEN_TAG)
    ? `${AUTOCOMPLETE_OPEN_TAG}${node.attrs.label}${AUTOCOMPLETE_CLOSE_TAG}`
    : `${node.attrs.label}`;

  return (
    <NodeViewWrapper as={'span'} contentEditable={'false'} suppressContentEditableWarning>
      <NodeViewContent
        as={'span'}
        className={'suggestion'}
        contentEditable
        suppressContentEditableWarning
        data-error={errorCode}
        onInput={(event: ChangeEvent<HTMLInputElement>) => {
          const text = event.target.innerText;
          const variable = getValidatedVariable(text, variablesSet);

          if (variable) {
            updateVariableAttributes(variable);

            return;
          }

          // remove empty node
          if (text.length === 0) {
            props.deleteNode();
            editor.commands.focus();
          }
        }}
        onBlur={(event: FocusEvent<HTMLInputElement>) => {
          const text = event.target.innerText;
          const variable = getValidatedVariable(text, variablesSet);

          if (variable) {
            updateVariableAttributes(variable);
          } else {
            updateVariableAttributes(text, VariableErrorCode.INVALID_NAME);
          }
        }}
      >
        {renderedNodeViewContent}
      </NodeViewContent>
    </NodeViewWrapper>
  );
}
/**
 * Get the variable name from input text if a valid reference exists. Otherwise, returns undefined.
 */
function getValidatedVariable(text: string = '', possibleVariables: Set<string>) {
  const variableContent = text.includes(AUTOCOMPLETE_OPEN_TAG) ? text.match(AUTOCOMPLETE_REGEX)?.[1] : text;

  if (!variableContent) {
    return;
  }

  const variableName = variableContent.split(LIQUID_FILTER_CHAR)[0].trim();

  if (!possibleVariables.has(variableName)) {
    return;
  }

  return variableContent;
}
