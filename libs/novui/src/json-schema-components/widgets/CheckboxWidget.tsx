import { WidgetProps } from '@rjsf/utils';
import { Checkbox } from '../../components/checkbox/Checkbox';

export const CheckboxWidget = (props: WidgetProps) => {
  return (
    <Checkbox
      checked={typeof props.value === 'undefined' ? false : props.value}
      description={props.schema.description}
      onChange={({ target }) => props.onChange(target.checked)}
      required={props.required}
      label={props.label}
    />
  );
};
