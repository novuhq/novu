import { useFormContext } from 'react-hook-form';
import { useValueEditor, ValueEditorProps } from 'react-querybuilder';
import { RiInformationLine, RiErrorWarningLine } from 'react-icons/ri';

import { InputRoot, InputWrapper } from '@/components/primitives/input';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { ControlInput } from '../primitives/control-input/control-input';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/primitives/hover-card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/primitives/tooltip';
import type { HelpTextInfo } from '@/components/conditions-editor/field-type-editors';

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

  // Helper component for error icon with tooltip
  const ErrorIcon = ({ hasError }: { hasError: boolean }) => {
    if (!hasError || !error) return null;

    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-default items-center justify-center pl-1 pr-1">
              <RiErrorWarningLine className="text-destructive h-4 w-4 shrink-0" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={5}>
            <p>{error.message}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (operator === 'between' || operator === 'notBetween') {
    const betweenPlaceholder = getPlaceholder ? getPlaceholder(field, operator) : 'value1,value2';
    const [fromPlaceholder, toPlaceholder] = betweenPlaceholder.split(',').map((p) => p.trim());

    const editors = ['from', 'to'].map((key, i) => {
      const hasError = !!error && !valueAsArray[i];

      return (
        <InputRoot key={key} className="bg-bg-white w-28" hasError={hasError}>
          <InputWrapper>
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
            <ErrorIcon hasError={hasError} />
          </InputWrapper>
        </InputRoot>
      );
    });

    return (
      <div className="flex items-start gap-1">
        {editors[0]}
        <span className="text-foreground-600 text-paragraph-xs mt-1.5">and</span>
        {editors[1]}
        {helpText && (
          <HoverCard openDelay={100}>
            <HoverCardTrigger asChild>
              <button type="button" className="mt-1">
                <RiInformationLine className="text-foreground-400 hover:text-foreground-600 size-4 cursor-help" />
              </button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80" side="top">
              <div className="space-y-3">
                <div className="text-foreground-950 font-medium">{helpText.title}</div>
                <div className="text-foreground-600 text-sm">{helpText.description}</div>
                <div className="space-y-2">
                  <div className="text-foreground-950 text-xs font-medium">Examples:</div>
                  <div className="space-y-1">
                    {helpText.examples.map((example, idx) => (
                      <div key={idx} className="text-foreground-800 rounded bg-neutral-50 px-2 py-1 font-mono text-xs">
                        {example}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-1">
      <InputRoot className="bg-bg-white w-40" hasError={!!error}>
        <InputWrapper>
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
          <ErrorIcon hasError={!!error} />
        </InputWrapper>
      </InputRoot>
      {helpText && (
        <HoverCard openDelay={100}>
          <HoverCardTrigger asChild>
            <button type="button" className="mt-1">
              <RiInformationLine className="text-foreground-400 hover:text-foreground-600 size-4 cursor-help" />
            </button>
          </HoverCardTrigger>
          <HoverCardContent className="w-80" side="top">
            <div className="space-y-3">
              <div className="text-foreground-950 font-medium">{helpText.title}</div>
              <div className="text-foreground-600 text-sm">{helpText.description}</div>
              <div className="space-y-2">
                <div className="text-foreground-950 text-xs font-medium">Examples:</div>
                <div className="space-y-1">
                  {helpText.examples.map((example, idx) => (
                    <div key={idx} className="text-foreground-800 rounded bg-neutral-50 px-2 py-1 font-mono text-xs">
                      {example}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      )}
    </div>
  );
};
