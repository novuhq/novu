import { WidgetProps } from '@rjsf/utils';
import { Checkbox } from '../../components/checkbox/Checkbox';

export const CheckboxWidget = (props: WidgetProps) => {
  return (
    <Checkbox
      checked={props.value}
      description={props.schema.description}
      onChange={props.onChange}
      required={props.required}
      label={props.label}
    />
  );
};
