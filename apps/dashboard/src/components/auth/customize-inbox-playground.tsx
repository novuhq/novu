import { EditorView } from '@uiw/react-codemirror';
import { Info } from 'lucide-react';
import { FormProvider, useFormContext, UseFormReturn } from 'react-hook-form';
import { RiInputField, RiLayoutLine } from 'react-icons/ri';

import { InAppActionDropdown } from '@/components/in-app-action-dropdown';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/primitives/accordion';
import { ColorPicker } from '@/components/primitives/color-picker';
import { Editor } from '@/components/primitives/editor';
import { FormControl, FormField, FormItem } from '@/components/primitives/form/form';
import { capitalize } from '@/utils/string';
import { InputRoot, InputWrapper } from '../primitives/input';
import type { InboxPlaygroundFormData } from './inbox-playground';

interface PreviewStyle {
  id: string;
  label: string;
  image: string;
}

interface CustomizeInboxProps {
  form: UseFormReturn<InboxPlaygroundFormData>;
}

const previewStyles: PreviewStyle[] = [
  { id: 'popover', label: 'Popover', image: '/images/auth/popover-layout.svg' },
  { id: 'sidebar', label: 'Side Menu', image: '/images/auth/sidebar-layout.svg' },
  { id: 'full-width', label: 'Full Width', image: '/images/auth/full-width-layout.svg' },
];

export function CustomizeInbox({ form }: CustomizeInboxProps) {
  const selectedStyle = form.watch('selectedStyle');
  const openAccordion = form.watch('openAccordion');

  const handleAccordionChange = (value: string | undefined) => {
    form.setValue('openAccordion', value);
  };

  return (
    <div className="space-y-3 p-3">
      <Accordion type="single" collapsible value={openAccordion} onValueChange={handleAccordionChange}>
        <AccordionItem value="layout" className="bg-white p-0">
          <AccordionTrigger className="bg-neutral-alpha-50 p-2 data-[state=open]:border-b">
            <div className="flex items-center gap-1 text-xs">
              <RiLayoutLine className="text-feature size-5" />
              Customize Inbox
            </div>
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-2 p-2">
            <div className="grid grid-cols-3 gap-2.5">
              {previewStyles.map((style) => (
                <StylePreviewCard
                  key={style.id}
                  style={style}
                  isSelected={selectedStyle === style.id}
                  onSelect={() => form.setValue('selectedStyle', style.id)}
                />
              ))}
            </div>

            <ColorPickerSection form={form} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <FormProvider {...form}>
        <Accordion type="single" collapsible value={openAccordion} onValueChange={handleAccordionChange}>
          <AccordionItem value="configure" className="bg-white p-0">
            <AccordionTrigger className="bg-neutral-alpha-50 p-2 data-[state=open]:border-b">
              <div className="flex items-center gap-1 text-xs">
                <RiInputField className="text-feature size-5" />
                Configure notification
              </div>
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-2 p-2">
              <NotificationConfigSection />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </FormProvider>
    </div>
  );
}

function StylePreviewCard({
  style,
  isSelected,
  onSelect,
}: {
  style: PreviewStyle;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      key={style.id}
      className={`group relative h-[100px] cursor-pointer overflow-hidden rounded-lg border transition-all duration-200 active:scale-[0.98] ${
        isSelected ? 'border-2 border-neutral-200' : 'border border-neutral-100 hover:border-neutral-200'
      }`}
      style={{
        backgroundImage: `url(${style.image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'top',
      }}
      onClick={onSelect}
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
    >
      <div
        className={`absolute bottom-0 w-full translate-y-full transform border-t bg-neutral-50/90 text-center opacity-0 transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100 ${isSelected ? '!translate-y-0 !opacity-100' : ''}`}
      >
        <span className="text-xs leading-6">{style.label}</span>
      </div>
    </div>
  );
}

function ColorPickerSection({ form }: { form: UseFormReturn<InboxPlaygroundFormData> }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1 rounded-lg border">
          <div className="flex items-center justify-between p-1 px-2">
            <span className="text-xs font-medium">Primary</span>
            <ColorPicker
              value={form.watch('primaryColor')}
              onChange={(color) => form.setValue('primaryColor', color)}
            />
          </div>
        </div>

        <div className="flex-1 rounded-lg border">
          <div className="flex items-center justify-between p-1 px-2">
            <span className="text-xs font-medium">Foreground</span>
            <ColorPicker
              value={form.watch('foregroundColor')}
              onChange={(color) => form.setValue('foregroundColor', color)}
            />
          </div>
        </div>
      </div>

      <div className="flex items-start gap-1 text-xs">
        <Info className="text-foreground-400 mt-0.5 h-4 w-4" />
        <p className="text-foreground-400 leading-[21px]">
          The Inbox is completely customizable, using the{' '}
          <a href="https://docs.novu.co/inbox/react/styling#appearance-prop" className="cursor-pointer underline">
            appearance prop
          </a>
        </p>
      </div>
    </div>
  );
}

const extensions = [EditorView.lineWrapping];
const basicSetup = {
  defaultKeymap: true,
};

function NotificationConfigSection() {
  const { control } = useFormContext();

  return (
    <div className="flex flex-col gap-1 p-1">
      <div className="flex gap-1">
        <FormField
          control={control}
          name="subject"
          render={({ field, fieldState }) => (
            <FormItem className="w-full">
              <FormControl>
                <InputRoot hasError={!!fieldState.error}>
                  <InputWrapper className="flex items-center justify-center px-1 py-2">
                    <Editor
                      indentWithTab={false}
                      fontFamily="inherit"
                      placeholder={capitalize(field.name)}
                      id={field.name}
                      extensions={extensions}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </InputWrapper>
                </InputRoot>
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={control}
        name="body"
        render={({ field }) => (
          <FormItem className="w-full">
            <FormControl>
              <InputRoot>
                <InputWrapper className="flex h-36 items-center justify-center px-1 py-2">
                  <Editor
                    fontFamily="inherit"
                    indentWithTab={false}
                    placeholder={capitalize(field.name)}
                    id={field.name}
                    extensions={extensions}
                    basicSetup={basicSetup}
                    ref={field.ref}
                    value={field.value}
                    onChange={field.onChange}
                    height="100%"
                  />
                </InputWrapper>
              </InputRoot>
            </FormControl>
          </FormItem>
        )}
      />
      <InAppActionDropdown />
    </div>
  );
}
