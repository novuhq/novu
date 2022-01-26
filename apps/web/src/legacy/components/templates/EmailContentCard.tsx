import { Card, Collapse, Form, Input, Radio } from 'antd';
import { Control, Controller, useFormContext } from 'react-hook-form';
import { IApplication, IEmailBlock } from '@notifire/shared';
import AceEditor from 'react-ace';

import 'ace-builds/src-noconflict/mode-handlebars';
import 'ace-builds/src-noconflict/theme-monokai';
import styled from 'styled-components';
import { EmailMessageEditor } from './email-editor/EmailMessageEditor';
import { Builder, BuilderFieldProps } from '../query-builder/components/Builder';

export function EmailContentCard({
  index,
  showFilters,
  variables = [],
  application,
}: {
  index: number;
  showFilters: boolean;
  variables: {
    name: string;
  }[];
  application: IApplication | undefined;
}) {
  const {
    control,
    formState: { errors },
    getValues,
    watch,
  } = useFormContext(); // retrieve all hook methods
  const contentType = watch(`emailMessages.${index}.template.contentType`);

  const fields: BuilderFieldProps[] = [
    {
      field: 'firstName',
      type: 'TEXT',
      label: 'First Name',
      operators: ['EQUAL', 'NOT_EQUAL'],
    },
    {
      field: 'lastName',
      type: 'TEXT',
      label: 'Last Name',
      operators: ['EQUAL', 'NOT_EQUAL'],
    },
    {
      field: 'companyName',
      type: 'TEXT',
      label: 'Company Name',
      operators: ['EQUAL', 'NOT_EQUAL'],
    },
    {
      field: 'companyId',
      type: 'TEXT',
      label: 'Company Id',
      operators: ['EQUAL', 'NOT_EQUAL'],
    },
  ];

  for (const variable of variables) {
    const found = fields.find((i) => i.field === variable.name);

    if (!found) {
      fields.push({
        field: variable.name,
        type: 'TEXT',
        label: variable.name,
        operators: ['EQUAL', 'NOT_EQUAL'],
      });
    }
  }

  return (
    <>
      <Card bordered={false} title="Template">
        <SubjectLineWrapper>
          <Form.Item
            validateStatus={errors[`emailMessages.${index}.template.subject`] ? 'error' : ''}
            label="Subject line"
            rules={[{ required: true, message: 'Please input subject' }]}>
            <Controller
              name={`emailMessages.${index}.template.subject` as any}
              control={control}
              render={({ field }) => {
                return (
                  <Input
                    {...field}
                    defaultValue={field.value}
                    placeholder="Subject line"
                    type="text"
                    data-test-id="emailSubject"
                  />
                );
              }}
            />
          </Form.Item>
        </SubjectLineWrapper>
        <Form.Item label={false} data-test-id="editor-type-selector">
          <Controller
            name={`emailMessages.${index}.template.contentType` as any}
            control={control}
            render={({ field }) => (
              <Radio.Group
                style={{ float: 'right' }}
                size="middle"
                options={[
                  { value: 'editor', label: 'Editor' },
                  { value: 'customHtml', label: 'Custom Code' },
                ]}
                onChange={field.onChange}
                value={field.value}
                optionType="button"
              />
            )}
          />
        </Form.Item>
        {!contentType || contentType === 'editor' ? (
          <Form.Item label={false}>
            <Controller
              name={`emailMessages.${index}.template.content` as any}
              control={control}
              render={({ field, formState }) => {
                return (
                  <EmailMessageEditor
                    branding={application?.branding}
                    onChange={field.onChange}
                    value={field.value as IEmailBlock[]}
                  />
                );
              }}
            />
          </Form.Item>
        ) : null}
        {contentType === 'customHtml' ? (
          <Form.Item label={false}>
            <Controller
              name={`emailMessages.${index}.template.htmlContent` as any}
              control={control}
              render={({ field, formState }) => {
                return (
                  <>
                    <AceEditor
                      data-test-id="custom-code-editor"
                      style={{ width: '100%' }}
                      mode="handlebars"
                      theme="monokai"
                      name="codeEditor"
                      onChange={field.onChange}
                      height="300px"
                      fontSize={14}
                      showPrintMargin
                      showGutter
                      highlightActiveLine
                      value={field.value ? String(field.value) : ''}
                      setOptions={{
                        enableBasicAutocompletion: true,
                        enableLiveAutocompletion: false,
                        enableSnippets: true,
                        showLineNumbers: true,
                        tabSize: 2,
                      }}
                    />
                  </>
                );
              }}
            />
          </Form.Item>
        ) : null}
      </Card>

      {showFilters && (
        <Card bordered={false} title="Filters">
          <Controller
            name={`emailMessages.${index}.filters` as any}
            control={control}
            render={({ field }) => (
              <Builder readOnly={false} fields={fields} data={field.value || []} onChange={field.onChange} />
            )}
          />
        </Card>
      )}
    </>
  );
}

const SubjectLineWrapper = styled.div``;
