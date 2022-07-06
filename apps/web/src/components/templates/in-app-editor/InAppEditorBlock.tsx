import React from 'react';
import { InAppWidgetPreview } from '../../widget/InAppWidgetPreview';
import { IMessage, IMessageButton, MessageActionStatusEnum } from '@novu/shared';
import { ContentContainer } from './ContentContainer';

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
  function onContentChange(data) {
    const currentValue = Object.assign({}, value);
    currentValue.content = data;
    onChange(currentValue);
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
      <ContentContainer
        contentPlaceholder={contentPlaceholder}
        onContentChange={onContentChange}
        initContent={value.content}
        readonly={readonly}
      />
    </InAppWidgetPreview>
  );
}
