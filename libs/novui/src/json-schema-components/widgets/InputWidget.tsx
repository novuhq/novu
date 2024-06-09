import { WidgetProps } from '@rjsf/utils';
import { Input } from '../../components/input/Input';

export const InputWidget = (props: WidgetProps) => {
  let type: 'text' | 'password' | 'email' | 'search' | 'tel' | 'url' | 'number' | 'time' = 'text';
  if (['number', 'search', 'tel', 'url', 'email', 'time', 'password'].includes(props.schema.type as string)) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    type = props.schema.type;
  }

  return (
    <Input
      description={props.schema.description}
      onChange={(event) => props.onChange(event.target.value)}
      value={props.value}
      // defaultValue={(props.schema.default as string) || ''}
      required={props.required}
      label={props.label}
      type={type}
      error={props.rawErrors}
    />
  );
};
