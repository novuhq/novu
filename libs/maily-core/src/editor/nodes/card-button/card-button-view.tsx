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

  const selectCardButton = () => {
    if (!editor.isEditable) {
      return;
    }

    // Always select the node so attribute updates (Configure Variable) have a
    // target. When a variable pill is clicked, `editor.storage.variable.popover`
    // suppresses the Actions bubble so only Configure Variable is shown.
    editor.commands.setNodeSelection(getPos());
  };

  return (
    <NodeViewWrapper data-type="cardButton" data-selected={selected ? 'true' : undefined} className="mly-inline-flex">
      {/* Not a <button>: mousedown preventDefault keeps editor focus on click so the
          Actions bubble stays open. tabIndex + Enter/Space cover keyboard users. */}
      <div
        role="button"
        tabIndex={editor.isEditable ? 0 : -1}
        data-selected={selected ? 'true' : undefined}
        // No color transition: tweening bg/border/text independently flashes
        // unreadable combos (e.g. primary black bg while text is still dark).
        className="mly-inline-flex mly-cursor-pointer mly-select-none mly-items-center mly-justify-center mly-rounded-md mly-px-3 mly-py-1 mly-text-sm mly-font-semibold mly-no-underline data-[selected=true]:mly-ring-2 data-[selected=true]:mly-ring-gray-400 data-[selected=true]:mly-ring-offset-1"
        style={
          {
            backgroundColor: preset.backgroundColor,
            color: preset.color,
            borderWidth: 2,
            borderStyle: 'solid',
            borderColor: preset.borderColor,
          } as CSSProperties
        }
        onMouseDown={(event) => {
          // Prevent the div from taking focus on click (would hide the Actions bubble).
          event.preventDefault();
        }}
        onClick={selectCardButton}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') {
            return;
          }

          event.preventDefault();
          selectCardButton();
        }}
      >
        {matchingProvider ? matchingProvider.renderValue(label, editor, 'button-variable') : label}
      </div>
    </NodeViewWrapper>
  );
}
