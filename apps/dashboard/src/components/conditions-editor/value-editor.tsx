import { useFormContext } from 'react-hook-form';
import { useValueEditor, ValueEditorProps } from 'react-querybuilder';
import { RiInformationLine, RiErrorWarningLine } from 'react-icons/ri';

import { InputRoot, InputWrapper } from '@/components/primitives/input';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { ControlInput } from '../primitives/control-input/control-input';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/primitives/hover-card';
import type { HelpTextInfo } from '@/components/conditions-editor/field-type-editors';
import { Badge } from '../primitives/badge';

type ExtendedContext = {
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
  getPlaceholder?: (fieldName: string, operator: string) => string;
  getHelpText?: (fieldName: string, operator: string) => HelpTextInfo;
};

export const ValueEditor = (props: ValueEditorProps) => {
  const form = useFormContext();
  const queryPath = 'query.rules.' + props.path.join('.rules.') + '.value';
  const { error } = form.getFieldState(queryPath, form.formState);
  const { variables = [], isAllowedVariable, getPlaceholder, getHelpText } = (props.context as ExtendedContext) ?? {};
  const { value, handleOnChange, operator, field } = props;
  const { valueAsArray, multiValueHandler } = useValueEditor(props);

  if (operator === 'null' || operator === 'notNull') {
    return null;
  }

  // Get dynamic placeholder and help text
  const placeholder = getPlaceholder ? getPlaceholder(field, operator) : 'value';
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
        <HoverCardContent className="w-[240px] p-2">
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

  if (operator === 'between' || operator === 'notBetween') {
    const betweenPlaceholder = getPlaceholder ? getPlaceholder(field, operator) : 'value1,value2';
    const [fromPlaceholder, toPlaceholder] = betweenPlaceholder.split(',').map((p) => p.trim());

    const editors = ['from', 'to'].map((key, i) => {
      const hasError = !!error && !valueAsArray[i];
      const isLastInput = i === 1;

      return (
        <InputRoot key={key} className="bg-bg-white w-28" hasError={hasError}>
          <InputWrapper className="gap-0 px-0">
            <ControlInput
              multiline={false}
              indentWithTab={false}
              placeholder={i === 0 ? fromPlaceholder : toPlaceholder}
              value={valueAsArray[i] ?? ''}
              onChange={(newValue) => multiValueHandler(newValue, i)}
              variables={variables}
              isAllowedVariable={isAllowedVariable}
              size="3xs"
            />
            {isLastInput && <CombinedIcon hasError={!!error} errorMessage={error?.message} />}
          </InputWrapper>
        </InputRoot>
      );
    });

    return (
      <div className="flex items-start gap-1">
        {editors[0]}
        <span className="text-foreground-600 text-paragraph-xs mt-1.5">and</span>
        {editors[1]}
      </div>
    );
  }

  return (
    <InputRoot className="bg-bg-white w-48" hasError={!!error}>
      <InputWrapper className="gap-0 px-0">
        <ControlInput
          multiline={false}
          indentWithTab={false}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={handleOnChange}
          variables={variables}
          isAllowedVariable={isAllowedVariable}
          size="3xs"
        />
        <CombinedIcon hasError={!!error} errorMessage={error?.message} />
      </InputWrapper>
    </InputRoot>
  );
};
