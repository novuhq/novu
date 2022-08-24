import { useEffect, useRef, useState } from 'react';
import { createStyles, Textarea, useMantineTheme } from '@mantine/core';
import { IEmailBlock } from '@novu/shared';

import { colors } from '../../../design-system';
import { useFormContext } from 'react-hook-form';

export function ContentContainer({
  contentPlaceholder,
  readonly,
  value,
  onChange,
  index,
}: {
  contentPlaceholder: string;
  readonly: boolean;
  onChange: (data: any) => void;
  value: string;
  index: number;
}) {
  const theme = useMantineTheme();
  const ref = useRef<HTMLDivElement>(null);
  const showPlaceHolder = value.length === 0;
  const [content, setContent] = useState<string | IEmailBlock[]>(value);
  const { classes } = useStyles();

  const {
    formState: { errors },
  } = useFormContext();

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
      <Textarea
        classNames={classes}
        error={errors?.steps ? errors.steps[index]?.template?.content?.message : undefined}
        placeholder={showPlaceHolder ? contentPlaceholder : ''}
      />
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

const useStyles = createStyles((theme, _params, getRef) => {
  return {
    wrapper: {
      position: 'absolute',
      width: '100%',
      height: '29px',
      zIndex: 1,
      top: 0,
      pointerEvents: 'none',
      opacity: '0.4',
    },

    input: {
      border: 'none',
      padding: '0',
      fontWeight: '700',
    },

    error: {
      margin: '0',
    },
  } as any;
});
