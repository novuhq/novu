import { useFormContext } from 'react-hook-form';
import { ValueEditorProps } from 'react-querybuilder';
import { RiInformationLine, RiErrorWarningLine } from 'react-icons/ri';

import { InputRoot, InputWrapper } from '@/components/primitives/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/primitives/hover-card';
import { Badge } from '@/components/primitives/badge';
import type { HelpTextInfo } from '@/components/conditions-editor/field-type-editors';

type RelativeDateValue = {
  amount: number;
  unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';
};

type ExtendedContext = {
  getHelpText?: (fieldName: string, operator: string) => HelpTextInfo;
};

const TIME_UNITS = [
  { value: 'minutes', label: 'minutes' },
  { value: 'hours', label: 'hours' },
  { value: 'days', label: 'days' },
  { value: 'weeks', label: 'weeks' },
  { value: 'months', label: 'months' },
  { value: 'years', label: 'years' },
] as const;

export function RelativeDateValueEditor(props: ValueEditorProps) {
  const form = useFormContext();
  const queryPath = 'query.rules.' + props.path.join('.rules.') + '.value';
  const { error } = form.getFieldState(queryPath, form.formState);
  const { getHelpText } = (props.context as ExtendedContext) ?? {};
  const { value, handleOnChange, operator, field } = props;

  // Parse the current value
  let parsedValue: RelativeDateValue = { amount: 1, unit: 'days' };

  try {
    if (typeof value === 'string' && value) {
      const parsed = JSON.parse(value);

      if (parsed && typeof parsed.amount === 'number' && parsed.unit) {
        parsedValue = parsed;
      }
    } else if (typeof value === 'object' && value) {
      parsedValue = value as RelativeDateValue;
    }
  } catch {
    // Keep default value
  }

  const handleAmountChange = (newAmount: string) => {
    const amount = parseInt(newAmount, 10);

    if (!isNaN(amount) && amount > 0) {
      const newValue = { ...parsedValue, amount };
      handleOnChange(JSON.stringify(newValue));
    }
  };

  const handleUnitChange = (newUnit: string) => {
    const newValue = { ...parsedValue, unit: newUnit as RelativeDateValue['unit'] };
    handleOnChange(JSON.stringify(newValue));
  };

  // Get help text for the operator
  const helpText = getHelpText ? getHelpText(field, operator) : null;

  // Combined icon component that shows error or info content
  const CombinedIcon = ({ hasError, errorMessage }: { hasError: boolean; errorMessage?: string }) => {
    if (!helpText && !hasError) return null;

    const IconComponent = hasError ? RiErrorWarningLine : RiInformationLine;
    const iconColor = hasError ? 'text-destructive' : 'text-foreground-400 hover:text-foreground-600';

    return (
      <HoverCard openDelay={100}>
        <HoverCardTrigger asChild>
          <div className="mr-1 flex cursor-help items-center justify-center" role="button" tabIndex={-1}>
            <IconComponent className={`size-4 ${iconColor}`} />
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-[280px] p-2">
          <div>
            {/* Error content (shown above info when present) */}
            {hasError && errorMessage && (
              <>
                <div className="text-label-xs mb-1 font-medium text-red-600">{errorMessage}</div>
                {helpText && <div className="mb-1.5 border-t border-neutral-200" />}
              </>
            )}

            {helpText && (
              <>
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <div>
                      <Badge color="yellow" size="sm" variant="lighter" className="mr-1">
                        💡 TIP
                      </Badge>
                    </div>
                    <div className="text-label-xs mt-1 text-gray-600">{helpText.description}</div>
                  </div>
                </div>
                <div className="mt-1 space-y-1 pl-1.5">
                  {helpText.examples.map((example, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <div className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-gray-400" />
                      <div className="text-label-xs text-gray-600">{example}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  };

  return (
    <div className="flex items-center gap-1">
      <InputRoot className="bg-bg-white w-16" hasError={!!error}>
        <InputWrapper className="gap-0 px-0">
          <input
            type="number"
            min="1"
            step="1"
            value={parsedValue.amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="1"
            className="text-paragraph-xs placeholder:text-foreground-400 border-none bg-transparent px-2 py-1.5 outline-none"
          />
          <CombinedIcon hasError={!!error} errorMessage={error?.message} />
        </InputWrapper>
      </InputRoot>

      <Select value={parsedValue.unit} onValueChange={handleUnitChange}>
        <SelectTrigger className="bg-bg-white text-paragraph-xs border-border-strong h-7 w-20 px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIME_UNITS.map((unit) => (
            <SelectItem key={unit.value} value={unit.value} className="text-paragraph-xs">
              {unit.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
