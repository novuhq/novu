import { Card, Col, Form, Input } from 'antd';
import { Control, Controller, useFormContext } from 'react-hook-form';
import styled from 'styled-components';
import { useEffect } from 'react';
import { IForm } from '../../pages/templates/editor/use-template-controller.hook';

export function TemplateSMSEditor({ control, index }: { control: Control<IForm>; index: number; errors: any }) {
  const {
    formState: { errors },
  } = useFormContext();

  return (
    <Card>
      <Form.Item
        data-test-id="smsNotificationContent"
        label="SMS message content"
        validateStatus={errors[`smsMessages.${index}.template.content`] ? 'error' : ''}>
        <Controller
          name={`smsMessages.${index}.template.content` as any}
          control={control}
          render={({ field }) => <Input.TextArea {...field} rows={4} placeholder="Notification content" />}
        />
      </Form.Item>
    </Card>
  );
}
