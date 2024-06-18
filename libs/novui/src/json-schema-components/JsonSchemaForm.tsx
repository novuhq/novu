import React from 'react';
import { RJSFSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
import Form from '@rjsf/core';

import { CheckboxWidget, SelectWidget, InputWidget } from './widgets';

import { AddButton, MoveDownButton, RemoveButton, MoveUpButton } from './templates/IconButton';
import { ArrayFieldItemTemplate, ArrayFieldTemplate, ArrayFieldTitleTemplate } from './templates/ArrayFieldTemplate';
import { ObjectFieldTemplate } from './templates/ObjectFieldTemplate';
import { css } from '../../styled-system/css';

const WIDGETS = {
  CheckboxWidget: CheckboxWidget,
  SelectWidget: SelectWidget,
  TextWidget: InputWidget,
  URLWidget: InputWidget,
  EmailWidget: InputWidget,
};

const UI_SCHEMA = {
  'ui:globalOptions': { addable: true, copyable: false, label: true, hideError: true, orderable: true },
  'ui:options': {
    hideError: true,
    submitButtonOptions: {
      norender: true,
    },
  },
};
export const JsonSchemaForm = ({
  schema,
  formData,
  onChange,
}: {
  schema: RJSFSchema;
  formData: any;
  onChange?: (data: any) => void;
}) => {
  return (
    <>
      <Form
        tagName={'div'}
        className={css({
          '& .control-label': {
            display: 'none',
          },
          '& .field-description': {
            display: 'none',
          },
        })}
        uiSchema={UI_SCHEMA}
        schema={schema}
        formData={formData}
        widgets={WIDGETS}
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
