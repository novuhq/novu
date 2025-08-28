import { Info } from 'lucide-react';
import { useId } from 'react';
import { Controller, UseFormReturn } from 'react-hook-form';
import { RiLayoutLine } from 'react-icons/ri';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/primitives/accordion';
import { ColorPicker } from '@/components/primitives/color-picker';
import { Switch } from '../primitives/switch';

interface PreviewStyle {
  id: string;
  label: string;
  image: string;
}

interface CustomizeInboxFormData {
  selectedStyle: string;
  enableTabs: boolean;
  primaryColor: string;
  foregroundColor: string;
}

interface CustomizeInboxProps {
  form: UseFormReturn<CustomizeInboxFormData>;
}

const previewStyles: PreviewStyle[] = [
  { id: 'popover', label: 'Popover', image: '/images/auth/popover-layout.svg' },
  { id: 'sidebar', label: 'Side Menu', image: '/images/auth/sidebar-layout.svg' },
  { id: 'full-width', label: 'Full Width', image: '/images/auth/full-width-layout.svg' },
];

export function CustomizeInbox({ form }: CustomizeInboxProps) {
  const selectedStyle = form.watch('selectedStyle');
  const enableTabsId = useId();

  return (
    <div className="space-y-3 p-3">
      <Accordion type="single" value="layout">
        <AccordionItem value="layout" className="bg-white p-0">
          <AccordionTrigger
            className="bg-neutral-alpha-50 hover:bg-neutral-alpha-50 cursor-default select-text p-2 active:scale-100 data-[state=open]:border-b"
            withChevron={false}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-1 text-xs">
                <RiLayoutLine className="text-feature size-5" />
                Customize Inbox
              </div>
              <div className="flex items-center gap-2">
                <Controller
                  control={form.control}
                  name="enableTabs"
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      id={enableTabsId}
                      className="text-[#7D52F4]"
                    />
                  )}
                />
                <label
                  htmlFor={enableTabsId}
                  className="text-foreground cursor-pointer select-none text-xs font-normal"
                >
                  Enable Tabs
                </label>
              </div>
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
    <button
      type="button"
      className={`group relative h-[100px] cursor-pointer overflow-hidden rounded-lg border transition-all duration-200 active:scale-[0.98] ${
        isSelected ? 'border-2 border-neutral-200' : 'border border-neutral-100 hover:border-neutral-200'
      }`}
      style={{
        backgroundImage: `url(${style.image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'top',
      }}
      onClick={onSelect}
      aria-pressed={isSelected}
    >
      <div
        className={`absolute bottom-0 w-full translate-y-full transform border-t bg-neutral-50/90 text-center opacity-0 transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100 ${isSelected ? '!translate-y-0 !opacity-100' : ''}`}
      >
        <span className="text-xs leading-6">{style.label}</span>
      </div>
    </button>
  );
}

function ColorPickerSection({ form }: { form: UseFormReturn<CustomizeInboxFormData> }) {
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
          <a
            href="https://docs.novu.co/platform/inbox/configuration/styling"
            className="cursor-pointer underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            appearance prop
          </a>
        </p>
      </div>
    </div>
  );
}
