import { getInputProps, WidgetProps } from '@rjsf/utils';
import { TextInputType, Textarea } from '../../components';

/**
 * @deprecated
 * Use `InputEditorWidget` instead
 */
export const TextareaWidget = (props: WidgetProps) => {
  const { type, value, label, schema, onChange, options, required, readonly, rawErrors, disabled } = props;
  const inputProps = getInputProps(schema, type, options);

  return (
    <Textarea
      description={props.schema.description}
      onChange={(event) => {
        event.preventDefault();
        onChange(event.target.value);
      }}
      value={value || value === 0 ? value : ''}
      required={required}
      label={label}
      type={inputProps.type as TextInputType}
      error={rawErrors?.length > 0 && rawErrors}
      readOnly={readonly}
      disabled={disabled}
    />
  );
};
