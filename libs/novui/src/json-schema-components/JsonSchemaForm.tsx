import { useEffect, useRef } from 'react';
import Form, { FormProps } from '@rjsf/core';
import { RegistryWidgetsType, UiSchema, toErrorSchema, RJSFValidationError, FormValidation } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';

import { splitCssProps } from '../../styled-system/jsx';
import { JsxStyleProps } from '../../styled-system/types';
import { css, cx } from '../../styled-system/css';

import { CoreProps } from '../types';
import { ArrayFieldItemTemplate, ArrayFieldTemplate, ArrayFieldTitleTemplate } from './templates/ArrayFieldTemplate';
import { AddButton, MoveDownButton, MoveUpButton, RemoveButton } from './templates/IconButton';
import { ObjectFieldTemplate } from './templates/ObjectFieldTemplate';
import { CheckboxWidget, SelectWidget, InputEditorWidget } from './widgets';
import { JSON_SCHEMA_FORM_ID_DELIMITER } from './utils';

const WIDGETS: RegistryWidgetsType = {
  CheckboxWidget: CheckboxWidget,
  SelectWidget: SelectWidget,
  TextWidget: InputEditorWidget,
  URLWidget: InputEditorWidget,
  EmailWidget: InputEditorWidget,
};

const UI_SCHEMA: UiSchema = {
  'ui:globalOptions': { addable: true, copyable: false, label: true, orderable: true },
  'ui:options': {
    hideError: true,
    submitButtonOptions: {
      norender: true,
    },
  },
};

export type JsonSchemaFormProps<TFormData = any> = JsxStyleProps &
  CoreProps &
  Pick<FormProps<TFormData>, 'onChange' | 'onSubmit' | 'onBlur' | 'schema' | 'formData' | 'tagName'> & {
    variables?: string[];
    errors?: any;
  };

const getExtraErrors = (errors: RJSFValidationError[]) => {
  if (!errors) return;

  return toErrorSchema(errors);
};

function transformErrors(errors: RJSFValidationError[]) {
  console.log('transformErrors', errors);

  return [];
}

/**
 * Specialized form editor for data passed as JSON.
 */
export function JsonSchemaForm<TFormData = any>(props: JsonSchemaFormProps<TFormData>) {
  const [cssProps, { className, variables, errors, ...formProps }] = splitCssProps(props);

  const formRef = useRef<Form>(null);

  function customValidate(formData: TFormData, formErrors: FormValidation<TFormData>) {
    const extraErrors = getExtraErrors(errors);

    if (extraErrors) {
      formErrors = { ...formErrors, ...extraErrors };
    }

    return formErrors;
  }

  useEffect(() => {
    formRef.current.validateForm();
  }, [errors]);

  return (
    <Form
      ref={formRef}
      tagName={'fieldset'}
      className={cx(
        css({
          // default elements to hide
          '& .control-label, & .field-description': {
            display: 'none',
          },
          // hide raw text errors
          '& .panel.panel-danger.errors': {
            display: 'none',
          },
        }),
        css(cssProps),
        className
      )}
      uiSchema={UI_SCHEMA}
      widgets={WIDGETS}
      validator={validator}
      transformErrors={transformErrors}
      customValidate={customValidate}
      liveValidate
      noHtml5Validate
      autoComplete={'false'}
      formContext={{ variables }}
      idSeparator={JSON_SCHEMA_FORM_ID_DELIMITER}
      templates={{
        ArrayFieldTitleTemplate,
        ArrayFieldTemplate,
        ArrayFieldItemTemplate,
        ObjectFieldTemplate,
        ButtonTemplates: { MoveDownButton, AddButton, RemoveButton, MoveUpButton },
      }}
      {...formProps}
    />
  );
}
