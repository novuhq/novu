import { RegistryWidgetsType, UiSchema } from '@rjsf/utils';
import { ComponentProps } from 'react';
import { SelectWidget } from './select-widget';
import { SwitchWidget } from './switch-widget';
import { TextWidget } from './text-widget';

export const JSON_SCHEMA_FORM_ID_DELIMITER = '~~~';
export const ROOT_DELIMITER = 'root';
/**
 * The length of the root delimiter ( root + ".")
 */
export const ROOT_DELIMITER_LENGTH = 5;

export const UI_SCHEMA: UiSchema = {
  'ui:globalOptions': { addable: true, copyable: false, label: true, orderable: true },
  'ui:options': {
    hideError: true,
    submitButtonOptions: {
      norender: true,
    },
  },
};

export const WIDGETS: RegistryWidgetsType = {
  TextWidget: TextWidget,
  URLWidget: (props: ComponentProps<typeof TextWidget>) => <TextWidget {...props} multiline={false} />,
  EmailWidget: TextWidget,
  CheckboxWidget: SwitchWidget,
  SelectWidget: SelectWidget,
};

/**
 * Get the field name from the field identifier
 * It converts the RJSF field identifier to RHF compatible field name
 * @param fieldIdentifier
 */
export const getFieldName = (fieldIdentifier: string) => {
  return fieldIdentifier.split(JSON_SCHEMA_FORM_ID_DELIMITER).join('.').slice(ROOT_DELIMITER_LENGTH);
};
