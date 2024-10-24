'use client';

import { Avatar, AvatarImage } from '@/components/primitives/avatar';
import { Button } from '@/components/primitives/button';
import { FormControl, FormMessage } from '@/components/primitives/form/form';
import { Input, InputField } from '@/components/primitives/input';
import { Label } from '@/components/primitives/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { Separator } from '@/components/primitives/separator';
import TextSeparator from '@/components/primitives/text-separator';
import { useState, forwardRef } from 'react';
import { RiEdit2Line, RiImageEditFill } from 'react-icons/ri';

const predefinedAvatars = [
  `${window.location.origin}/images/avatar.svg`,
  `${window.location.origin}/images/building.svg`,
  `${window.location.origin}/images/info.svg`,
  `${window.location.origin}/images/speaker.svg`,
  `${window.location.origin}/images/confetti.svg`,
  `${window.location.origin}/images/novu.svg`,
  `${window.location.origin}/images/info-2.svg`,
  `${window.location.origin}/images/bell.svg`,
  `${window.location.origin}/images/error.svg`,
  `${window.location.origin}/images/warning.svg`,
  `${window.location.origin}/images/question.svg`,
  `${window.location.origin}/images/error-warning.svg`,
];

type AvatarPickerProps = React.InputHTMLAttributes<HTMLInputElement>;

export const AvatarPicker = forwardRef<HTMLInputElement, AvatarPickerProps>(({ id, ...props }, ref) => {
  const [isOpen, setIsOpen] = useState(false);

  const handlePredefinedAvatarClick = (url: string) => {
    props.onChange?.({ target: { value: url } } as React.ChangeEvent<HTMLInputElement>);
    setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      <Popover modal={true} open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="text-foreground-600 size-10">
            {props.value ? (
              <Avatar>
                <AvatarImage src={props.value as string} />
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
                <RiEdit2Line className="size-4" /> Customize avatar
              </div>
              <Separator />
              <div className="space-y-1">
                <Label>Avatar URL</Label>
                <FormControl>
                  <InputField>
                    <Input type="url" id={id} placeholder="Enter avatar URL" ref={ref} {...props} />
                  </InputField>
                </FormControl>
                <FormMessage />
              </div>
            </div>
            <TextSeparator text="or" />
            <div className="grid grid-cols-6 gap-4">
              {predefinedAvatars.map((url, index) => (
                <Button key={index} variant="ghost" className="p-0" onClick={() => handlePredefinedAvatarClick(url)}>
                  <Avatar>
                    <AvatarImage src={url} />
                  </Avatar>
                </Button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <FormMessage />
    </div>
  );
});

AvatarPicker.displayName = 'AvatarPicker';
