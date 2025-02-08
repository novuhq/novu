import { forwardRef, useMemo, useState } from 'react';
import { RiEdit2Line, RiImageEditFill } from 'react-icons/ri';

import { Avatar, AvatarImage } from '@/components/primitives/avatar';
import { Button } from '@/components/primitives/button';
import { FormMessage } from '@/components/primitives/form/form';
import { Label } from '@/components/primitives/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { Separator } from '@/components/primitives/separator';
import TextSeparator from '@/components/primitives/text-separator';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { parseStepVariablesToLiquidVariables } from '@/utils/parseStepVariablesToLiquidVariables';
import { InputRoot } from '../input';
import { useFormField } from './form-context';
import { ControlInput } from '../control-input';

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

export const AvatarPicker = forwardRef<HTMLInputElement, AvatarPickerProps>(({ name, value, onChange, onPick }) => {
  const { step } = useWorkflow();
  const variables = useMemo(() => (step ? parseStepVariablesToLiquidVariables(step.variables) : []), [step]);
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
            mode="outline"
            variant={!!error ? 'error' : 'secondary'}
            className="text-foreground-600 relative size-full overflow-hidden"
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
        <PopoverContent className="w-[300px] p-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium leading-none">
                <RiEdit2Line className="size-4" /> Select avatar
              </div>
              <Separator />
              <div className="space-y-1">
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
                  />
                </InputRoot>
                <FormMessage />
              </div>
            </div>
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
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
});

AvatarPicker.displayName = 'AvatarPicker';
