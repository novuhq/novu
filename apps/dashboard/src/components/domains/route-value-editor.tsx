import { useFormContext } from 'react-hook-form';
import { useValueEditor, type ValueEditorProps } from 'react-querybuilder';
import { Input } from '@/components/primitives/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';

const BOOLEAN_OPTIONS = [
  { value: 'true', label: 'true' },
  { value: 'false', label: 'false' },
];

function getQueryPath(path: number[]): string {
  return `query.rules.${path.join('.rules.')}.value`;
}

function PlainInput({
  value,
  onChange,
  placeholder,
  hasError,
  disabled,
  type = 'text',
  className = 'w-48',
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  hasError: boolean;
  disabled?: boolean;
  type?: 'text' | 'number';
  className?: string;
}) {
  return (
    <Input
      size="2xs"
      type={type}
      value={value}
      placeholder={placeholder}
      hasError={hasError}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className={className}
    />
  );
}

export function RouteValueEditor(props: ValueEditorProps) {
  const form = useFormContext();
  const queryPath = getQueryPath(props.path);
  const { error } = form?.getFieldState ? form.getFieldState(queryPath, form.formState) : { error: undefined };
  const hasError = Boolean(error);

  const { value, handleOnChange, operator, disabled, inputType } = props;
  const { valueAsArray, multiValueHandler } = useValueEditor(props);
  const stringValue = typeof value === 'string' ? value : value == null ? '' : String(value);
  const placeholder =
    typeof (props as { placeholder?: unknown }).placeholder === 'string'
      ? ((props as { placeholder?: string }).placeholder ?? 'value')
      : 'value';

  if (operator === 'null' || operator === 'notNull') {
    return null;
  }

  if (operator === 'between' || operator === 'notBetween') {
    const stringValueAsArray = valueAsArray.map((v) => (typeof v === 'string' ? v : `${v ?? ''}`));

    return (
      <div className="flex items-center gap-1.5">
        <PlainInput
          className="w-24"
          value={stringValueAsArray[0] ?? ''}
          placeholder="from"
          hasError={hasError && !stringValueAsArray[0]}
          disabled={disabled}
          type={inputType === 'number' ? 'number' : 'text'}
          onChange={(next) => multiValueHandler(next, 0)}
        />
        <span className="text-text-soft text-paragraph-xs">and</span>
        <PlainInput
          className="w-24"
          value={stringValueAsArray[1] ?? ''}
          placeholder="to"
          hasError={hasError && !stringValueAsArray[1]}
          disabled={disabled}
          type={inputType === 'number' ? 'number' : 'text'}
          onChange={(next) => multiValueHandler(next, 1)}
        />
      </div>
    );
  }

  if (inputType === 'checkbox' || inputType === 'boolean') {
    const current = stringValue === 'true' || stringValue === 'false' ? stringValue : 'true';

    return (
      <Select value={current} onValueChange={handleOnChange} disabled={disabled}>
        <SelectTrigger className="bg-bg-white text-paragraph-xs h-7 w-24 px-2" size="2xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BOOLEAN_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-paragraph-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <PlainInput
      value={stringValue}
      placeholder={placeholder}
      hasError={hasError}
      disabled={disabled}
      type={inputType === 'number' ? 'number' : 'text'}
      onChange={handleOnChange}
    />
  );
}
