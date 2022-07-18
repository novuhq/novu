import styled from '@emotion/styled';
import React, { useEffect, useRef, useState } from 'react';
import { useMantineTheme } from '@mantine/core';
import { colors } from '../../../design-system';
import { IEmailBlock } from '@novu/shared';

export function ContentContainer({
  contentPlaceholder,
  readonly,
  value,
  onChange,
}: {
  contentPlaceholder: string;
  readonly: boolean;
  onChange: (data: any) => void;
  value: string;
}) {
  const theme = useMantineTheme();
  const ref = useRef<HTMLDivElement>(null);
  const [visiblePlaceholder, setVisiblePlaceholder] = useState(!!value);
  const [content, setContent] = useState<string | IEmailBlock[]>(value);

  const handleChange = (e: React.ChangeEvent<HTMLDivElement>) => {
    const textContent = e.target.textContent;
    if (ref?.current) {
      ref.current.textContent = textContent;
    }

    let showPlaceHolder = !textContent;
    if (textContent === '<br>') showPlaceHolder = true;
    setVisiblePlaceholder(showPlaceHolder);

    onChange(textContent);
  };

  useEffect(() => {
    let showPlaceHolder = value.length === 0;
    if (value === '<br>') showPlaceHolder = true;
    setVisiblePlaceholder(showPlaceHolder);
  }, [value, content]);

  useEffect(() => {
    if (value !== ref.current?.textContent) {
      setContent(value);
    }
  }, [value]);

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
