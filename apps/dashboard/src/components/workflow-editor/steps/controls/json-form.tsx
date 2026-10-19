import Form, { FormProps } from '@rjsf/core';
import validator from '@rjsf/validator-ajv8';
import { ArrayFieldItemTemplate } from './array-field-item-template';
import { ArrayFieldTemplate } from './array-field-template';
import { ArrayFieldTitleTemplate } from './array-field-title-template';
import { AddButton, RemoveButton } from './button-templates';
import { ObjectFieldTemplate } from './object-field-template';
import { JSON_SCHEMA_FORM_ID_DELIMITER, UI_SCHEMA, WIDGETS } from './template-utils';

type JsonFormProps<TFormData = unknown> = Pick<
  FormProps<TFormData>,
  'onChange' | 'onSubmit' | 'onBlur' | 'schema' | 'formData' | 'tagName' | 'onError' | 'disabled'
> & {
  variables?: string[];
};

export function JsonForm(props: JsonFormProps) {
  return (
    <Form
      tagName={'fieldset'}
      className="*:flex *:flex-col *:gap-3 [&_.control-label]:hidden [&_.field-decription]:hidden [&_.panel.panel-danger.errors]:hidden"
      uiSchema={UI_SCHEMA}
      widgets={WIDGETS}
      validator={validator}
      autoComplete="false"
      idSeparator={JSON_SCHEMA_FORM_ID_DELIMITER}
      templates={{
        ButtonTemplates: {
          AddButton,
          RemoveButton,
        },
        ArrayFieldTemplate,
        ArrayFieldItemTemplate,
        ArrayFieldTitleTemplate,
        ObjectFieldTemplate,
      }}
      {...props}
    />
  );
}
