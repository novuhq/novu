import styled from '@emotion/styled';
import { useEffect, useRef, useState } from 'react';
import { useMantineTheme } from '@mantine/core';
import { IEmailBlock } from '@novu/shared';

import { colors } from '../../../design-system';

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
  const showPlaceHolder = value.length === 0;
  const [content, setContent] = useState<string | IEmailBlock[]>(value);

  useEffect(() => {
    if (ref.current && value !== ref.current?.innerHTML) {
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
        onKeyUp={(e: any) => onChange(removeHtmlTagsInsideVariableBrackets(e.target.innerHTML))}
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
      <PlaceHolder show={showPlaceHolder}>{contentPlaceholder}</PlaceHolder>
    </div>
  );
}

function removeHtmlTagsInsideVariableBrackets(innerHTML: string) {
  return innerHTML.replace(/{{.*?}}/g, function (match) {
    return match.replace(/<\/?[^>]*?>/g, '');
  });
}

const PlaceHolder = styled.div<{ show: boolean }>`
  position: absolute;
  z-index: 1;
  top: 0;
  pointer-events: none;
  display: ${({ show }) => (show ? 'block' : 'none')};
  opacity: 0.4;
`;
