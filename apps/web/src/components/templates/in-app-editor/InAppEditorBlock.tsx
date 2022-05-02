import { useContext, useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { InAppWidgetPreview } from '../../widget/InAppWidgetPreview';
import { colors } from '../../../design-system';
import { useMantineTheme } from '@mantine/core';

export function InAppEditorBlock({
  contentPlaceholder,
  onChange,
  value,
  readonly,
}: {
  contentPlaceholder: string;
  value: string;
  onChange: (data: string) => void;
  readonly: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const theme = useMantineTheme();
  const [visiblePlaceholder, setVisiblePlaceholder] = useState(!!value);
  const [content, setContent] = useState<string>(value);

  useEffect(() => {
    ref.current?.focus();
  }, [ref]);

  useEffect(() => {
    let showPlaceHolder = !value;

    if (value === '<br>') showPlaceHolder = true;

    setVisiblePlaceholder(showPlaceHolder);
  }, [value, content]);

  useEffect(() => {
    if (value !== ref.current?.innerHTML) {
      setContent(value);
    }
  }, [value]);

  function onContentChange(data) {
    onChange(data);

    let showPlaceHolder = !data;
    if (data === '<br>') showPlaceHolder = true;

    setVisiblePlaceholder(showPlaceHolder);
  }

  return (
    <InAppWidgetPreview readonly>
      <div style={{ position: 'relative' }}>
        <div
          ref={ref}
          data-test-id="in-app-editor-content-input"
          contentEditable={!readonly}
          dangerouslySetInnerHTML={{
            __html: content,
          }}
          onKeyUp={(e: any) => onContentChange(e.target.innerHTML)}
          suppressContentEditableWarning
          style={{
            display: 'inline-block',
            width: '100%',
            outline: 'none',
            backgroundColor: 'transparent',
            ...(readonly
              ? {
                  backgroundColor: theme.colorScheme === 'dark' ? colors.B20 : colors.B98,
                  color: theme.colorScheme === 'dark' ? colors.B40 : colors.B70,
                  opacity: 0.6,
                }
              : {}),
          }}
        />
        <PlaceHolder show={visiblePlaceholder}>{contentPlaceholder}</PlaceHolder>
      </div>
    </InAppWidgetPreview>
  );
}

const PlaceHolder = styled.div<{ show: boolean }>`
  position: absolute;
  z-index: 1;
  top: 0px;
  pointer-events: none;
  display: ${({ show }) => (show ? 'block' : 'none')};
  opacity: 0.4;
`;
