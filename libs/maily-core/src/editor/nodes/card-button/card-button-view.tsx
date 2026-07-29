import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { Link2, Zap } from 'lucide-react';
import { CSSProperties, useState } from 'react';
import { useMatchingProvider, useSuggestionProviders } from '@/editor/bubble-suggestions';
import { Popover, PopoverContent, PopoverTrigger } from '@/editor/components/popover';
import { Divider } from '@/editor/components/ui/divider';
import { LinkInputPopover } from '@/editor/components/ui/link-input-popover';
import { Select } from '@/editor/components/ui/select';
import { TooltipProvider } from '@/editor/components/ui/tooltip';
import { cn } from '@/editor/utils/classname';
import { DEFAULT_BUTTON_BACKGROUND_COLOR, DEFAULT_BUTTON_TEXT_COLOR } from '../button/button';
import { ButtonLabelInput } from '../button/button-label-input';
import { AllowedCardButtonStyle, allowedCardButtonStyle, CardButtonAttributes } from './card-button';

/**
 * Editor-only preview colors. Delivery-time rendering (Slack/Teams/Telegram/…)
 * maps `style` to each platform's native button variant.
 */
const STYLE_PRESETS: Record<AllowedCardButtonStyle, { backgroundColor: string; color: string; borderColor: string }> = {
  default: { backgroundColor: '#e5e7eb', color: '#111827', borderColor: '#e5e7eb' },
  primary: {
    backgroundColor: DEFAULT_BUTTON_BACKGROUND_COLOR,
    color: DEFAULT_BUTTON_TEXT_COLOR,
    borderColor: DEFAULT_BUTTON_BACKGROUND_COLOR,
  },
  danger: { backgroundColor: '#dc2626', color: '#ffffff', borderColor: '#dc2626' },
};

const STYLE_LABELS: Record<AllowedCardButtonStyle, string> = {
  default: 'Default',
  primary: 'Primary',
  danger: 'Danger',
};

// Card buttons only support link buttons for now. The Action ID input (for
// future interactive/postback buttons) stays wired up but hidden until we add
// a button `type` toggle — flip this to re-expose it.
const SHOW_ACTION_ID_INPUT = false;

export function CardButtonView(props: NodeViewProps) {
  const { node, editor, getPos } = props;
  const { label, isLabelVariable, style, url, isUrlVariable, actionId, isActionIdVariable } =
    node.attrs as CardButtonAttributes;

  const [open, setOpen] = useState(false);
  const providers = useSuggestionProviders(editor, ['variable', 'inlineDecorator']);
  const matchingProvider = useMatchingProvider(label, providers);

  const preset = STYLE_PRESETS[style] ?? STYLE_PRESETS.default;

  return (
    <NodeViewWrapper draggable={editor.isEditable} data-drag-handle={editor.isEditable} data-type="cardButton">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div>
            <button
              className="mly-inline-flex mly-items-center mly-justify-center mly-rounded-md mly-px-3 mly-py-1 mly-mt-1 mly-text-sm mly-font-semibold mly-no-underline mly-transition-colors disabled:mly-pointer-events-none disabled:mly-opacity-50"
              tabIndex={-1}
              style={
                {
                  backgroundColor: preset.backgroundColor,
                  color: preset.color,
                  borderWidth: 2,
                  borderStyle: 'solid',
                  borderColor: preset.borderColor,
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
              {matchingProvider ? matchingProvider.renderValue(label, editor, 'button-variable') : label}
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
                value={label}
                onValueChange={(value, isVariable) => {
                  editor.commands.updateCardButtonAttributes({
                    label: value,
                    isLabelVariable: isVariable ?? false,
                  });
                }}
                isVariable={isLabelVariable}
                editor={editor}
              />

              <Divider />

              <div className="mly-flex mly-space-x-0.5">
                <Select
                  label="Style"
                  value={style}
                  options={allowedCardButtonStyle.map((value) => ({
                    value,
                    label: STYLE_LABELS[value],
                  }))}
                  onValueChange={(value) => {
                    editor.commands.updateCardButtonAttributes({
                      style: value as AllowedCardButtonStyle,
                    });
                  }}
                  tooltip="Style"
                />
              </div>

              <Divider />

              <div className={cn('mly-flex mly-space-x-0.5')}>
                <LinkInputPopover
                  defaultValue={url || ''}
                  onValueChange={(value, isVariable) => {
                    editor.commands.updateCardButtonAttributes({
                      url: value,
                      isUrlVariable: isVariable ?? false,
                    });
                  }}
                  tooltip="URL"
                  icon={Link2}
                  editor={editor}
                  isVariable={isUrlVariable}
                />

                {SHOW_ACTION_ID_INPUT && (
                  <LinkInputPopover
                    defaultValue={actionId || ''}
                    onValueChange={(value, isVariable) => {
                      editor.commands.updateCardButtonAttributes({
                        actionId: value,
                        isActionIdVariable: isVariable ?? false,
                      });
                    }}
                    tooltip="Action ID"
                    placeholder="Enter action ID"
                    icon={Zap}
                    editor={editor}
                    isVariable={isActionIdVariable}
                  />
                )}
              </div>
            </div>
          </TooltipProvider>
        </PopoverContent>
      </Popover>
    </NodeViewWrapper>
  );
}
