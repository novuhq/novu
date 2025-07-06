import { forwardRef, useState } from 'react';
import { RiImageEditFill } from 'react-icons/ri';

import { Avatar, AvatarImage } from '@/components/primitives/avatar';
import { Button } from '@/components/primitives/button';
import { FormMessage } from '@/components/primitives/form/form';
import { Label } from '@/components/primitives/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { Separator } from '@/components/primitives/separator';
import TextSeparator from '@/components/primitives/text-separator';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { ControlInput } from '@/components/workflow-editor/control-input';
import { InputRoot } from '../input';
import { useFormField } from './form-context';

const DEFAULT_AVATARS = Object.freeze([
  `/images/avatar.svg`,
  `/images/building.svg`,
  `/images/info.svg`,
  `/images/speaker.svg`,
  `/images/confetti.svg`,
  `/images/novu.svg`,
  `/images/info-2.svg`,
  `/images/bell.svg`,
  `/images/error.svg`,
  `/images/warning.svg`,
  `/images/question.svg`,
  `/images/error-warning.svg`,
]);

type AvatarPickerProps = {
  name: string;
  value: string;
  onChange: (value: string) => void;
  onPick?: (value: string) => void;
};

export const AvatarPicker = forwardRef<HTMLInputElement, AvatarPickerProps>((props, _) => {
  const { name, value, onChange, onPick } = props;
  const { step, digestStepBeforeCurrent } = useWorkflow();
  const { variables, isAllowedVariable } = useParseVariables(step?.variables, digestStepBeforeCurrent?.stepId);
  const [isOpen, setIsOpen] = useState(false);
  const { error } = useFormField();

  const handlePredefinedAvatarClick = (url: string) => {
    onPick?.(url);
    setIsOpen(false);
  };

  return (
    <div className="size-9 space-y-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild className="relative size-full overflow-hidden">
          <Button
            mode="ghost"
            className="text-foreground-600 shadow-xs relative size-full overflow-hidden hover:bg-transparent hover:shadow-sm"
          >
            {value && !error ? (
              <Avatar className="bg-transparent p-1">
                <AvatarImage src={value as string} />
              </Avatar>
            ) : (
              <RiImageEditFill className="size-5" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] space-y-4 p-4">
          <div className="flex items-center gap-2 text-sm font-medium leading-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="size-4"
            >
              <path
                d="M8 14C4.6862 14 2 11.3138 2 8C2 4.6862 4.6862 2 8 2C11.3138 2 14 4.6862 14 8C14 11.3138 11.3138 14 8 14ZM8 12.8C9.27304 12.8 10.4939 12.2943 11.3941 11.3941C12.2943 10.4939 12.8 9.27304 12.8 8C12.8 6.72696 12.2943 5.50606 11.3941 4.60589C10.4939 3.70571 9.27304 3.2 8 3.2C6.72696 3.2 5.50606 3.70571 4.60589 4.60589C3.70571 5.50606 3.2 6.72696 3.2 8C3.2 9.27304 3.70571 10.4939 4.60589 11.3941C5.50606 12.2943 6.72696 12.8 8 12.8ZM5 8H6.2C6.2 8.47739 6.38964 8.93523 6.72721 9.27279C7.06477 9.61036 7.52261 9.8 8 9.8C8.47739 9.8 8.93523 9.61036 9.27279 9.27279C9.61036 8.93523 9.8 8.47739 9.8 8H11C11 8.79565 10.6839 9.55871 10.1213 10.1213C9.55871 10.6839 8.79565 11 8 11C7.20435 11 6.44129 10.6839 5.87868 10.1213C5.31607 9.55871 5 8.79565 5 8Z"
                fill="#0E121B"
              />
            </svg>
            Customize avatar
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="text-xs font-medium">Avatar URL</Label>
            <InputRoot className="overflow-visible" hasError={!!error}>
              <ControlInput
                indentWithTab={false}
                placeholder="Enter avatar URL"
                id={name}
                value={`${value}`}
                onChange={onChange}
                className="flex h-full items-center"
                multiline={false}
                variables={variables}
                isAllowedVariable={isAllowedVariable}
              />
            </InputRoot>
          </div>
          <FormMessage />
          <TextSeparator text="or" />
          <div className="grid grid-cols-6 gap-x-2 gap-y-4">
            {DEFAULT_AVATARS.map((path) => {
              const url = `${window.location.origin}${path}`;
              return (
                <button key={path} className="rounded-full" onClick={() => handlePredefinedAvatarClick(url)}>
                  <Avatar>
                    <AvatarImage src={url} />
                  </Avatar>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
});

AvatarPicker.displayName = 'AvatarPicker';
