import React, { useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { InAppWidgetPreview } from '../../widget/InAppWidgetPreview';
import { colors } from '../../../design-system';
import { useMantineTheme } from '@mantine/core';
import { IEmailBlock, IMessage, IMessageButton, MessageActionStatusEnum } from '@novu/shared';

export function InAppEditorBlock({
  contentPlaceholder,
  onChange,
  value,
  readonly,
}: {
  contentPlaceholder: string;
  value: IMessage;
  onChange: (data: IMessage) => void;
  readonly: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const theme = useMantineTheme();
  const [visiblePlaceholder, setVisiblePlaceholder] = useState(!!value.content);
  const [content, setContent] = useState<string | IEmailBlock[]>(value.content);

  useEffect(() => {
    ref.current?.focus();
  }, [ref]);

  useEffect(() => {
    let showPlaceHolder = value.content.length === 0;

    if (value.content === '<br>') showPlaceHolder = true;

    setVisiblePlaceholder(showPlaceHolder);
  }, [value.content, content]);

  useEffect(() => {
    if (value.content !== ref.current?.innerHTML) {
      setContent(value.content);
    }
  }, [value.content]);

  function onContentChange(data) {
    const currentValue = Object.assign({}, value);
    currentValue.content = data;

    onChange(currentValue);

    let showPlaceHolder = !data;
    if (data === '<br>') showPlaceHolder = true;

    setVisiblePlaceholder(showPlaceHolder);
  }

  function onChangeCtaAdapter(buttons: IMessageButton[]) {
    const currentValue = Object.assign({}, value);
    currentValue.cta.action = { buttons: buttons, status: MessageActionStatusEnum.PENDING };

    onChange(currentValue);
  }

  return (
    <InAppWidgetPreview
      buttonTemplate={value?.cta?.action?.buttons}
      onChangeCtaAdapter={onChangeCtaAdapter}
      readonly={readonly}
    >
      <div style={{ position: 'relative' }}>
        <div
          ref={ref}
          data-test-id="in-app-editor-content-input"
          contentEditable={!readonly}
          dangerouslySetInnerHTML={{
            __html: content as string,
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
  top: 0;
  pointer-events: none;
  display: ${({ show }) => (show ? 'block' : 'none')};
  opacity: 0.4;
`;
