import React from 'react';
import { RJSFSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
import Form from '@rjsf/core';

import { CheckboxWidget, SelectWidget, InputWidget } from './widgets';

import { AddButton, MoveDownButton, RemoveButton, MoveUpButton } from './templates/IconButton';
import { ArrayFieldItemTemplate, ArrayFieldTemplate, ArrayFieldTitleTemplate } from './templates/ArrayFieldTemplate';
import { ObjectFieldTemplate } from './templates/ObjectFieldTemplate';

export const JsonSchemaForm = ({
  schema,
  formData,
  onChange,
}: {
  schema: RJSFSchema;
  formData: any;
  onChange?: (data: any) => void;
}) => {
  const widgets = {
    CheckboxWidget: CheckboxWidget,
    SelectWidget: SelectWidget,
    TextWidget: InputWidget,
    URLWidget: InputWidget,
    EmailWidget: InputWidget,
  };

  const uiSchema = {
    'ui:globalOptions': { addable: true, copyable: false, label: true, hideError: true, orderable: true },
    'ui:options': {
      hideError: true,
      submitButtonOptions: {
        norender: true,
      },
    },
  };

  return (
    <>
      <style>
        {` .control-label {
              display: none;
            }
            `}
      </style>
      <Form
        uiSchema={uiSchema}
        schema={schema}
        formData={formData}
        widgets={{
          ...widgets,
        }}
        validator={validator}
        onChange={onChange}
        liveValidate={true}
        templates={{
          ArrayFieldTitleTemplate,
          ArrayFieldTemplate,
          ArrayFieldItemTemplate,
          ObjectFieldTemplate,
          ButtonTemplates: { MoveDownButton, AddButton, RemoveButton, MoveUpButton },
        }}
      />
    </>
  );
};
