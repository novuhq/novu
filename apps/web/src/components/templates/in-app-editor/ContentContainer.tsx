import styled from '@emotion/styled';
import React, { useEffect, useRef, useState } from 'react';
import { useMantineTheme } from '@mantine/core';
import { colors } from '../../../design-system';
import { IEmailBlock } from '@novu/shared';

export function ContentContainer({
  contentPlaceholder,
  onContentChange,
  readonly,
  initContent,
}: {
  contentPlaceholder: string;
  onContentChange: (string) => void;
  readonly: boolean;
  initContent: string | IEmailBlock[];
}) {
  const theme = useMantineTheme();
  const ref = useRef<HTMLDivElement>(null);
  const [visiblePlaceholder, setVisiblePlaceholder] = useState(!!initContent);
  const [content, setContent] = useState<string | IEmailBlock[]>(initContent);

  const handleChange = (e: React.ChangeEvent<HTMLDivElement>) => {
    const textContent = e.target.textContent;

    if (ref?.current) {
      ref.current.textContent = textContent;
    }

    let showPlaceHolder = !textContent;
    if (textContent === '<br>') showPlaceHolder = true;
    setVisiblePlaceholder(showPlaceHolder);

    onContentChange(textContent);
  };

  useEffect(() => {
    if (content && ref?.current) {
      ref.current.textContent = content as string;
    }
  }, [content]);

  useEffect(() => {
    let showPlaceHolder = content.length === 0;

    if (initContent === '<br>') showPlaceHolder = true;

    setVisiblePlaceholder(showPlaceHolder);
  }, [initContent, content]);

  useEffect(() => {
    if (initContent !== ref.current?.innerHTML) {
      setContent(initContent);
    }
  }, [initContent]);

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={ref}
        data-test-id="in-app-editor-content-input"
        contentEditable={!readonly}
        dangerouslySetInnerHTML={{
          __html: content as string,
        }}
        onKeyUp={(e: any) => handleChange(e)}
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
  );
}

const PlaceHolder = styled.div<{ show: boolean }>`
  position: absolute;
  z-index: 1;
  top: 0;
  pointer-events: none;
  display: ${({ show }) => (show ? 'block' : 'none')};
  opacity: 0.4;
`;
