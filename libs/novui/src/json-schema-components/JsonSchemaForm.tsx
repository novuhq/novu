import Form, { FormProps } from '@rjsf/core';
import { RegistryWidgetsType, UiSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
import { splitCssProps } from '../../styled-system/jsx';
import { JsxStyleProps } from '../../styled-system/types';
import { css, cx } from '../../styled-system/css';
import { CoreProps } from '../types';
import { ArrayFieldItemTemplate, ArrayFieldTemplate, ArrayFieldTitleTemplate } from './templates/ArrayFieldTemplate';
import { AddButton, MoveDownButton, MoveUpButton, RemoveButton } from './templates/IconButton';
import { ObjectFieldTemplate } from './templates/ObjectFieldTemplate';
import { CheckboxWidget, InputWidget, SelectWidget, TextareaWidget } from './widgets';

const WIDGETS: RegistryWidgetsType = {
  CheckboxWidget: CheckboxWidget,
  SelectWidget: SelectWidget,
  TextWidget: TextareaWidget,
  URLWidget: InputWidget,
  EmailWidget: InputWidget,
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
  Pick<FormProps<TFormData>, 'onChange' | 'onSubmit' | 'onBlur' | 'schema' | 'formData' | 'tagName'>;

/**
 * Specialized form editor for data passed as JSON.
 */
export function JsonSchemaForm<TFormData = any>(props: JsonSchemaFormProps<TFormData>) {
  const [cssProps, { className, ...formProps }] = splitCssProps(props);

  return (
    <Form
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
      autoComplete={'false'}
      liveValidate
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
