import { Controller, useFormContext } from 'react-hook-form';
import { useState, KeyboardEvent, MouseEvent } from 'react';
import { Card, Typography } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import styled from 'styled-components';

export function MessageNameEditorHeader({ selector, message }: { selector: string; message: any }) {
  const { watch, setValue, control } = useFormContext();
  const [isEditing, setIsEditing] = useState<boolean>();

  function preventCollapsePropagation(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter') {
      event.stopPropagation();
    }
  }

  function onNameChanged(field, value: string) {
    setIsEditing(false);
    field.onChange(value);
  }

  function onEditIconClick(e: MouseEvent) {
    e.stopPropagation();
    setIsEditing(true);
  }

  function preventClickPropagation(e: MouseEvent) {
    if (isEditing) {
      e.stopPropagation();
    }
  }

  return (
    <Container
      onClick={preventClickPropagation}
      onKeyPress={preventCollapsePropagation}
      data-test-id="message-header-title">
      <Controller
        name={selector as any}
        defaultValue={message.name}
        control={control}
        render={({ field }) => {
          return (
            <Typography.Text
              editable={{
                onChange: (value) => onNameChanged(field, value),
                icon: (
                  // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                  <div onClick={onEditIconClick}>
                    <EditOutlined />
                  </div>
                ),
                editing: isEditing,
              }}>
              {field.value}
            </Typography.Text>
          );
        }}
      />
    </Container>
  );
}

const Container = styled.div`
  width: calc(100% - 30px);
  display: inline-block;

  div.ant-typography-edit-content {
    margin-bottom: 0;
  }

  textarea {
    margin-bottom: 0;
  }
`;
