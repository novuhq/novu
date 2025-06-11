import { useFormContext } from 'react-hook-form';
import { useValueEditor, ValueEditorProps } from 'react-querybuilder';
import { RiInformationLine, RiErrorWarningLine } from 'react-icons/ri';

import { InputRoot, InputWrapper } from '@/components/primitives/input';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { ControlInput } from '../primitives/control-input/control-input';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/primitives/hover-card';
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

  // Combined icon component that shows error or info content
  const CombinedIcon = ({ hasError, errorMessage }: { hasError: boolean; errorMessage?: string }) => {
    if (!helpText && !hasError) return null;

    const IconComponent = hasError ? RiErrorWarningLine : RiInformationLine;
    const iconColor = hasError ? 'text-destructive' : 'text-foreground-400 hover:text-foreground-600';

    return (
      <HoverCard openDelay={100}>
        <HoverCardTrigger asChild>
          <button type="button" className="mt-1">
            <IconComponent className={`size-4 cursor-help ${iconColor}`} />
          </button>
        </HoverCardTrigger>
        <HoverCardContent className="w-80" side="top">
          <div className="space-y-3">
            {/* Error content (shown above info when present) */}
            {hasError && errorMessage && (
              <>
                <div className="space-y-2">
                  <div className="text-destructive font-medium">Validation Error</div>
                  <div className="text-destructive text-sm">{errorMessage}</div>
                </div>
                {helpText && <div className="border-t border-neutral-200" />}
              </>
            )}

            {/* Info content (always shown when available) */}
            {helpText && (
              <>
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
          </InputWrapper>
        </InputRoot>
      );
    });

    return (
      <div className="flex items-start gap-1">
        {editors[0]}
        <span className="text-foreground-600 text-paragraph-xs mt-1.5">and</span>
        {editors[1]}
        <CombinedIcon hasError={!!error} errorMessage={error?.message} />
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
        </InputWrapper>
      </InputRoot>
      <CombinedIcon hasError={!!error} errorMessage={error?.message} />
    </div>
  );
};
