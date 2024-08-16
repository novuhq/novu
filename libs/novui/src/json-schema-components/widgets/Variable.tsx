import { ChangeEvent, FocusEvent, useState } from 'react';
import { NodeViewContent, NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { AUTOCOMPLETE_CLOSE_TAG, AUTOCOMPLETE_OPEN_TAG, AUTOCOMPLETE_REGEX } from '../constants';

export function Variable({ editor, node, updateAttributes, ...props }: NodeViewProps) {
  const [hasError, setHasError] = useState<boolean>(node.attrs.error || false);

  const updateVariableAttributes = (label: string, error: boolean) => {
    updateAttributes({ label, error: `${error}` });
    setHasError(error);
  };

  // In case of an invalid variable input, set content to be the label variable  which will include the whole invalid variable
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
        data-error={hasError}
        onInput={(event: ChangeEvent<HTMLInputElement>) => {
          const text = event.currentTarget.innerText;
          const regRes = text.match(AUTOCOMPLETE_REGEX);
          const sub = regRes?.[1];
          if (!regRes) {
            if (text.length === 0) {
              props.deleteNode();
              editor.commands.focus();
            }
          } else {
            updateVariableAttributes(sub, false);
          }
        }}
        onBlur={(event: FocusEvent<HTMLInputElement>) => {
          const text = event.currentTarget.innerText;
          const regRes = text.match(AUTOCOMPLETE_REGEX);
          const sub = regRes?.[1];
          if (!regRes) {
            updateVariableAttributes(text, true);
          } else {
            updateVariableAttributes(sub, false);
          }
        }}
      >
        {renderedNodeViewContent}
      </NodeViewContent>
    </NodeViewWrapper>
  );
}
