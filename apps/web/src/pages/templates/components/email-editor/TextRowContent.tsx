import { useEffect, useRef, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import styled from '@emotion/styled';
import { TextAlignEnum } from '@novu/shared';

import { colors } from '../../../../design-system';
import { useEnvController } from '../../../../hooks';
import type { IForm } from '../formTypes';

export function TextRowContent({ stepIndex, blockIndex }: { stepIndex: number; blockIndex: number }) {
  const methods = useFormContext<IForm>();
  const content = methods.watch(`steps.${stepIndex}.template.content.${blockIndex}.content`);
  const textAlign = methods.watch(`steps.${stepIndex}.template.content.${blockIndex}.styles.textAlign`);
  const { readonly } = useEnvController();
  const ref = useRef<HTMLDivElement>(null);
  const [text, setText] = useState<string>(content);
  const [visiblePlaceholder, setVisiblePlaceholder] = useState(!!content);

  useEffect(() => {
    ref.current?.focus();
  }, [ref]);

  function checkPlaceholderVisibility(data = content) {
    let showPlaceHolder = !data;

    if (data === '<br>') showPlaceHolder = true;

    setVisiblePlaceholder(showPlaceHolder);
  }

  useEffect(() => {
    if (content !== ref.current?.innerHTML) {
      setText(content);
    }
  }, [content]);

  useEffect(() => {
    checkPlaceholderVisibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, text]);

  return (
    <div style={{ position: 'relative' }}>
      <Controller
        name={`steps.${stepIndex}.template.content.${blockIndex}.content`}
        defaultValue=""
        control={methods.control}
        render={({ field }) => {
          return (
            <div
              ref={ref}
              data-test-id="editable-text-content"
              role="textbox"
              dangerouslySetInnerHTML={{
                __html: text,
              }}
              contentEditable={!readonly}
              suppressContentEditableWarning
              onKeyUp={(e: any) => {
                const html = e.target.innerHTML;
                field.onChange(html);
                checkPlaceholderVisibility(html);
              }}
              style={{
                outline: 'none',
                width: '100%',
                backgroundColor: 'transparent',
                textAlign: textAlign || TextAlignEnum.LEFT,
              }}
            />
          );
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
