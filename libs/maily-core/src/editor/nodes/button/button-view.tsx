import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { CSSProperties, useMemo, useState } from 'react';
import { useMatchingProvider, useSuggestionProviders } from '@/editor/bubble-suggestions';
import { AlignmentSwitch } from '@/editor/components/alignment-switch';
import { BaseButton } from '@/editor/components/base-button';
import { Popover, PopoverContent, PopoverTrigger } from '@/editor/components/popover';
import { ShowPopover } from '@/editor/components/show-popover';
import { ColorPicker } from '@/editor/components/ui/color-picker';
import { Divider } from '@/editor/components/ui/divider';
import { LinkInputPopover } from '@/editor/components/ui/link-input-popover';
import { Select } from '@/editor/components/ui/select';
import { TooltipProvider } from '@/editor/components/ui/tooltip';
import { cn } from '@/editor/utils/classname';
import {
  AllowedButtonBorderRadius,
  AllowedButtonVariant,
  allowedButtonBorderRadius,
  allowedButtonVariant,
  ButtonAttributes,
} from './button';
import { ButtonLabelInput } from './button-label-input';

export function ButtonView(props: NodeViewProps) {
  const { node, editor, getPos } = props;
  const {
    text,
    isTextVariable,
    alignment,
    variant,
    borderRadius: _radius,
    buttonColor,
    textColor,
    url: externalLink,
    showIfKey = '',
    isUrlVariable,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    width,
  } = node.attrs as ButtonAttributes;

  const [open, setOpen] = useState(false);
  // Use the new bubble suggestion system for rendering variables
  const providers = useSuggestionProviders(editor, ['variable', 'inlineDecorator']);
  const matchingProvider = useMatchingProvider(text, providers);
  const sizes = useMemo(
    () => ({
      small: {
        paddingX: 24,
        paddingY: 6,
      },
      medium: {
        paddingX: 32,
        paddingY: 10,
      },
      large: {
        paddingX: 40,
        paddingY: 14,
      },
    }),
    []
  );

  const size = useMemo(() => {
    return Object.entries(sizes).find(
      ([, { paddingX, paddingY }]) => paddingRight === paddingX && paddingTop === paddingY
    )?.[0] as 'small' | 'medium' | 'large';
  }, [paddingRight, paddingTop, sizes]);

  return (
    <NodeViewWrapper
      draggable={editor.isEditable}
      data-drag-handle={editor.isEditable}
      data-type="button"
      style={{
        textAlign: alignment,
      }}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div>
            <button
              className={cn(
                'mly-inline-flex mly-items-center mly-justify-center mly-rounded-md mly-text-sm mly-font-medium mly-ring-offset-white mly-transition-colors disabled:mly-pointer-events-none disabled:mly-opacity-50',
                'mly-font-semibold mly-no-underline',
                {
                  '!mly-rounded-full': _radius === 'round',
                  '!mly-rounded-md': _radius === 'smooth',
                  '!mly-rounded-none': _radius === 'sharp',
                }
              )}
              tabIndex={-1}
              style={
                {
                  backgroundColor: variant === 'filled' ? buttonColor : 'transparent',
                  color: textColor,
                  borderWidth: 2,
                  borderStyle: 'solid',
                  borderColor: buttonColor,
                  // decrease the border color opacity to 80%
                  // so that it's not too prominent
                  '--button-var-border-color': `${textColor}80`,

                  paddingTop,
                  paddingRight,
                  paddingBottom,
                  paddingLeft,
                  width,
                } as CSSProperties
              }
              onClick={(e) => {
                e.preventDefault();
                if (!editor.isEditable) {
                  return;
                }

                const pos = getPos();
                editor.commands.setNodeSelection(pos);
                setOpen(true);
              }}
            >
              {matchingProvider ? matchingProvider.renderValue(text, editor, 'button-variable') : text}
            </button>
          </div>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="top"
          className="mly-w-max mly-rounded-lg !mly-p-0.5"
          sideOffset={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <TooltipProvider>
            <div className="mly-flex mly-items-stretch mly-text-midnight-gray">
              <ButtonLabelInput
                value={text}
                onValueChange={(value, isVariable) => {
                  editor.commands.updateButtonAttributes({
                    text: value,
                    isTextVariable: isVariable ?? false,
                  });
                }}
                isVariable={isTextVariable}
                editor={editor}
              />

              <Divider />

              <div className="mly-flex mly-space-x-0.5">
                <Select
                  label="Border Radius"
                  value={_radius}
                  options={allowedButtonBorderRadius.map((value) => ({
                    value,
                    label: value,
                  }))}
                  onValueChange={(value) => {
                    editor.commands.updateButtonAttributes({
                      borderRadius: value as AllowedButtonBorderRadius,
                    });
                  }}
                  tooltip="Border Radius"
                  className="mly-capitalize"
                />

                <Select
                  label="Style"
                  value={variant}
                  options={allowedButtonVariant.map((value) => ({
                    value,
                    label: value,
                  }))}
                  onValueChange={(value) => {
                    editor.commands.updateButtonAttributes({
                      variant: value as AllowedButtonVariant,
                    });
                  }}
                  tooltip="Style"
                  className="mly-capitalize"
                />

                <Select
                  label="Size"
                  value={size}
                  options={[
                    { value: 'small', label: 'Small' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'large', label: 'Large' },
                  ]}
                  onValueChange={(value) => {
                    const { paddingX, paddingY } = sizes[value as 'small' | 'medium' | 'large'];

                    editor.commands.updateButtonAttributes({
                      paddingTop: paddingY,
                      paddingRight: paddingX,
                      paddingBottom: paddingY,
                      paddingLeft: paddingX,
                    });
                  }}
                  tooltip="Size"
                />
              </div>

              <Divider />

              <div className="mly-flex mly-space-x-0.5">
                <AlignmentSwitch
                  alignment={alignment}
                  onAlignmentChange={(alignment) => {
                    editor.commands.updateButtonAttributes({
                      alignment,
                    });
                  }}
                />

                <LinkInputPopover
                  defaultValue={externalLink || ''}
                  onValueChange={(value, isVariable) => {
                    editor.commands.updateButtonAttributes({
                      url: value,
                      isUrlVariable: isVariable ?? false,
                    });
                  }}
                  tooltip="Update External Link"
                  editor={editor}
                  isVariable={isUrlVariable}
                />
              </div>

              <Divider />

              <div className="mly-flex mly-space-x-0.5">
                <BackgroundColorPickerPopup
                  variant={variant}
                  color={buttonColor}
                  onChange={(color) => {
                    editor.commands.updateButtonAttributes({
                      buttonColor: color,
                    });
                  }}
                />

                <TextColorPickerPopup
                  color={textColor}
                  onChange={(color) => {
                    editor.commands.updateButtonAttributes({
                      textColor: color,
                    });
                  }}
                />
              </div>

              <Divider />

              <ShowPopover
                showIfKey={showIfKey}
                onShowIfKeyValueChange={(value) => {
                  editor.commands.updateButtonAttributes({
                    showIfKey: value,
                  });
                }}
                editor={editor}
              />
            </div>
          </TooltipProvider>
        </PopoverContent>
      </Popover>
    </NodeViewWrapper>
  );
}

type ColorPickerProps = {
  variant?: AllowedButtonVariant;
  color: string;
  onChange: (color: string) => void;
};

function BackgroundColorPickerPopup(props: ColorPickerProps) {
  const { color, onChange, variant } = props;

  return (
    <ColorPicker color={color} onColorChange={onChange} tooltip="Background Color">
      <BaseButton variant="ghost" size="sm" type="button" className="mly-size-7">
        <div
          className="mly-h-4 mly-w-4 mly-shrink-0 mly-rounded-full mly-shadow"
          style={{
            backgroundColor: variant === 'filled' ? color : 'transparent',
            borderStyle: 'solid',
            borderWidth: 2,
            borderColor: variant === 'filled' ? 'white' : color,
          }}
        />
      </BaseButton>
    </ColorPicker>
  );
}

function TextColorPickerPopup(props: ColorPickerProps) {
  const { color, onChange } = props;

  return (
    <ColorPicker color={color} onColorChange={onChange} tooltip="Text Color">
      <BaseButton variant="ghost" size="sm" type="button" className="mly-size-7">
        <div className="mly-flex mly-flex-col mly-items-center mly-justify-center mly-gap-[1px]">
          <span className="mly-font-bolder mly-font-mono mly-text-xs mly-text-midnight-gray">A</span>
          <div
            className="mly-h-[2px] mly-w-3 mly-shrink-0 mly-rounded-md mly-shadow"
            style={{ backgroundColor: color }}
          />
        </div>
      </BaseButton>
    </ColorPicker>
  );
}
