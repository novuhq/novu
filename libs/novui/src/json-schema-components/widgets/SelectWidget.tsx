import { WidgetProps } from '@rjsf/utils';
import { Select } from '../../components/select/Select';

export const SelectWidget = (props: WidgetProps) => {
  return (
    <Select
      description={props.schema.description}
      onChange={props.onChange}
      value={props.value}
      required={props.required}
      label={props.label}
      data={props.options.enumOptions}
    />
  );
};
