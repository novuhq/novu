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
import { CheckboxWidget, SelectWidget, InputEditorWidget } from './widgets';
import { JSON_SCHEMA_FORM_ID_DELIMITER } from './constants';
import { InputWidget } from './widgets/InputWidget';
import { TextareaWidget } from './widgets/TextareaWidget';

const WIDGETS: RegistryWidgetsType = {
  CheckboxWidget,
  SelectWidget,
  TextWidget: InputEditorWidget,
  URLWidget: InputEditorWidget,
  EmailWidget: InputEditorWidget,
};

/** @deprecated TODO: delete after Autocomplete is fully released */
const LEGACY_WIDGETS: RegistryWidgetsType = {
  CheckboxWidget,
  SelectWidget,
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
  Pick<FormProps<TFormData>, 'onChange' | 'onSubmit' | 'onBlur' | 'schema' | 'formData' | 'tagName'> & {
    variables?: string[];
  };

/**
 * Specialized form editor for data passed as JSON.
 */
export function JsonSchemaForm<TFormData = {}>(props: JsonSchemaFormProps<TFormData>) {
  const [cssProps, { className, variables, ...formProps }] = splitCssProps(props);

  const isAutocompleteEnabled = Boolean(variables && variables.length > 0);

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
      // @ts-expect-error
      uiSchema={UI_SCHEMA}
      widgets={isAutocompleteEnabled ? WIDGETS : LEGACY_WIDGETS}
      // @ts-expect-error
      validator={validator}
      liveValidate
      autoComplete={'false'}
      formContext={{ variables }}
      idSeparator={JSON_SCHEMA_FORM_ID_DELIMITER}
      templates={{
        // @ts-expect-error
        ArrayFieldTitleTemplate,
        ArrayFieldTemplate,
        ArrayFieldItemTemplate,
        ObjectFieldTemplate,
        // @ts-expect-error
        ButtonTemplates: { MoveDownButton, AddButton, RemoveButton, MoveUpButton },
      }}
      {...formProps}
    />
  );
}
