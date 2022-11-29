import { RefObject } from 'react';
import { MantineTheme, Textarea } from '@mantine/core';
import { colors } from '../../../../design-system';
import { IEmailBlock } from '@novu/shared/src';
import { FieldErrors, FieldValues } from 'react-hook-form';
import styled from '@emotion/styled';

interface IContentProps {
  readonly: boolean;
  ref?: RefObject<HTMLDivElement>;
  content: string | IEmailBlock[];
  onChange: (data: any) => void;
  theme?: MantineTheme;
  classes?: Record<never, string>;
  errors?: FieldErrors<FieldValues>;
  index: number;
  contentPlaceholder: string;
  showPlaceHolder: boolean;
}

export function Content(props: IContentProps) {
  return (
    <div>
      <div style={{ position: 'relative' }} data-test-id="content-text-area">
        <div
          ref={props.ref}
          data-test-id="in-app-editor-content-input"
          contentEditable={!props.readonly}
          dangerouslySetInnerHTML={{
            __html: props.content as string,
          }}
          onKeyUp={(e: any) => props.onChange(sanitizeHandlebarsVariables(e.target.innerHTML))}
          suppressContentEditableWarning
          style={{
            display: 'inline-block',
            width: '100%',
            outline: 'none',
            backgroundColor: 'transparent',
            ...(props.readonly
              ? {
                  backgroundColor: props.theme?.colorScheme === 'dark' ? colors.B20 : colors.B98,
                  color: props.theme?.colorScheme === 'dark' ? colors.B40 : colors.B70,
                  opacity: 0.6,
                }
              : {}),
          }}
        />
        <StyledTextarea
          classNames={props.classes}
          error={props.errors?.steps ? props.errors.steps[props.index]?.template?.content?.message : undefined}
          placeholder={props.showPlaceHolder ? props.contentPlaceholder : ''}
        />
      </div>
    </div>
  );
}

/**
 * Recursively remove a pattern from a string until there are no more matches.
 * Avoids incomplete sanitization e.g. "abcBanana".replace(/abc/g, "") === "abc"
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

const StyledTextarea = styled(Textarea)`
  textarea {
    background: transparent;
  }
`;
