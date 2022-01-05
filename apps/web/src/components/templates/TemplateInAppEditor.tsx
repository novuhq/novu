import { Card, Col, Form, Input, Row } from 'antd';
import { Control, Controller, useFormContext } from 'react-hook-form';
import { IForm } from '../../pages/templates/editor/use-template-controller.hook';
import { InAppEditorBlock } from './InAppEditorBlock';

export function TemplateInAppEditor({ control, index }: { control: Control<IForm>; index: number; errors: any }) {
  const {
    formState: { errors },
  } = useFormContext();

  return (
    <Card>
      <Row>
        <Col md={10}>
          <Form.Item
            label="In-App message content"
            data-test-id="in-app-content-form-item"
            validateStatus={errors[`inAppMessages.${index}.template.content`] ? 'error' : ''}>
            <Controller
              name={`inAppMessages.${index}.template.content` as any}
              control={control}
              render={({ field }) => {
                const { ref, ...fieldRefs } = field;

                return <InAppEditorBlock {...fieldRefs} contentPlaceholder="Notification content goes here" />;
              }}
            />
          </Form.Item>
        </Col>
        <Col md={14}>
          <Form.Item data-test-id="inAppRedirect" label="Redirect URL">
            <Controller
              name={`inAppMessages.${index}.template.cta.data.url` as any}
              control={control}
              render={({ field }) => <Input {...field} type="text" placeholder="i.e /tasks/{{taskId}}" />}
            />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );
}
