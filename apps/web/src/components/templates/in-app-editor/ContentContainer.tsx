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
        onKeyUp={(e: any) => onChange(sanitizeHandlebarsVariables(e.target.innerHTML))}
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

/**
 * Recursively remove a pattern from a string until there are no more matches.
 * Avoids incomplete sanitization e.g. "aabcbc".replace(/abc/g, "") === "abc"
 * See: https://github.com/novuhq/novu/security/code-scanning/9
 */
function sanitizeHandlebarsVariables(content: string): string {
  const handlebarsTags = /{{.*?}}/gi;
  const newStr = content.replace(handlebarsTags, function (match) {
    const htmlElementsMatch = /<\/?[^>]*?>/gi;

    return match.replace(htmlElementsMatch, '');
  });

  return newStr.length === content.length ? newStr : sanitizeHandlebarsVariables(newStr);
}

const PlaceHolder = styled.div<{ show: boolean }>`
  position: absolute;
  z-index: 1;
  top: 0;
  pointer-events: none;
  display: ${({ show }) => (show ? 'block' : 'none')};
  opacity: 0.4;
`;
