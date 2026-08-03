import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { CSSProperties } from 'react';
import { useMatchingProvider, useSuggestionProviders } from '@/editor/bubble-suggestions';
import { DEFAULT_BUTTON_BACKGROUND_COLOR, DEFAULT_BUTTON_TEXT_COLOR } from '../button/button';
import { AllowedCardButtonStyle, CardButtonAttributes } from './card-button';

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

export function CardButtonView(props: NodeViewProps) {
  const { node, editor, getPos, selected } = props;
  const { label, style } = node.attrs as CardButtonAttributes;

  const providers = useSuggestionProviders(editor, ['variable', 'inlineDecorator']);
  const matchingProvider = useMatchingProvider(label, providers);

  const preset = STYLE_PRESETS[style] ?? STYLE_PRESETS.default;

  return (
    <NodeViewWrapper data-type="cardButton" data-selected={selected ? 'true' : undefined} className="mly-inline-flex">
      <button
        className="mly-inline-flex mly-items-center mly-justify-center mly-rounded-md mly-px-3 mly-py-1 mly-text-sm mly-font-semibold mly-no-underline mly-transition-colors data-[selected=true]:mly-ring-2 data-[selected=true]:mly-ring-gray-400 data-[selected=true]:mly-ring-offset-1 disabled:mly-pointer-events-none disabled:mly-opacity-50"
        tabIndex={-1}
        data-selected={selected ? 'true' : undefined}
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

          editor.commands.setNodeSelection(getPos());
        }}
      >
        {matchingProvider ? matchingProvider.renderValue(label, editor, 'button-variable') : label}
      </button>
    </NodeViewWrapper>
  );
}
