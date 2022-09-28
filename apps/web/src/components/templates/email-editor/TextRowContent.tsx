import { IEmailBlock } from '@novu/shared';
import { useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { colors } from '../../../design-system';
import { useEnvController } from '../../../store/use-env-controller';

export function TextRowContent({ block, onTextChange }: { block: IEmailBlock; onTextChange: (text: string) => void }) {
  const { readonly } = useEnvController();
  const ref = useRef<HTMLDivElement>(null);
  const [text, setText] = useState<string>(block.content);
  const [visiblePlaceholder, setVisiblePlaceholder] = useState(!!block.content);

  useEffect(() => {
    ref.current?.focus();
  }, [ref]);

  function checkPlaceholderVisibility(data = block.content) {
    let showPlaceHolder = !data;

    if (data === '<br>') showPlaceHolder = true;

    setVisiblePlaceholder(showPlaceHolder);
  }

  function handleTextChange(data: string) {
    onTextChange(data);
    checkPlaceholderVisibility(data);
  }

  useEffect(() => {
    if (block.content !== ref.current?.innerHTML) {
      setText(block.content);
    }
  }, [block.content]);

  useEffect(() => {
    checkPlaceholderVisibility();
  }, [block.content, text]);

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={ref}
        data-test-id="editable-text-content"
        dangerouslySetInnerHTML={{
          __html: text,
        }}
        contentEditable={!readonly}
        suppressContentEditableWarning
        onKeyUp={(e: any) => handleTextChange(e.target.innerHTML)}
        style={{
          outline: 'none',
          width: '100%',
          backgroundColor: 'transparent',
          textAlign: block.styles?.textAlign || 'left',
        }}
      />

      <PlaceHolder color={colors.B60} show={visiblePlaceholder}>
        Type the email content here...
      </PlaceHolder>
    </div>
  );
}

const PlaceHolder = styled.div<{ show: boolean; color: string }>`
  position: absolute;
  color: ${({ color }) => color};
  z-index: 1;
  top: 0px;
  pointer-events: none;
  display: ${({ show }) => (show ? 'block' : 'none')};
`;
