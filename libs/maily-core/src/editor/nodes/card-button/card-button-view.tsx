import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { CSSProperties, useMemo, useRef } from 'react';
import { useSuggestionProviders } from '@/editor/bubble-suggestions';
import { dismissCardActionsMenu } from '@/editor/nodes/card-actions/card-actions';
import {
  closeVariablePopover,
  renderLiquidVariableSegments,
  setKeepCardActionsMenuOpen,
  VARIABLE_PILL_MARKER_ATTR,
} from '@/editor/utils/liquid-variables';
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
  const variableProvider = useMemo(
    () => providers.find((provider) => provider.name === 'variable') ?? null,
    [providers]
  );

  // Radix closes Configure Variable on mousedown-outside (the button chrome) before our click
  // handler runs. Capture whether Configure was open at mousedown so a chrome click switches to
  // Actions instead of being misread as "already selected → dismiss".
  const configureOpenOnMouseDownRef = useRef(false);

  const preset = STYLE_PRESETS[style] ?? STYLE_PRESETS.default;

  // TipTap's BubbleMenu only remounts/hides tippy when the selection changes. Meta-only flips of
  // `storage.variable.popover` leave tippy stuck open/closed — bounce off the node and back.
  const bounceCardButtonSelection = () => {
    const pos = getPos();

    if (typeof pos !== 'number') {
      return;
    }

    const after = Math.min(pos + node.nodeSize, editor.state.doc.content.size);

    editor.commands.setTextSelection(after);
    editor.commands.setNodeSelection(pos);
  };

  const activateCardButton = (event?: { target: EventTarget | null }) => {
    if (!editor.isEditable) {
      return;
    }

    const isVariablePillClick =
      event?.target instanceof Element && !!event.target.closest(`[${VARIABLE_PILL_MARKER_ATTR}]`);
    const switchingFromConfigure = configureOpenOnMouseDownRef.current || Boolean(editor.storage?.variable?.popover);

    configureOpenOnMouseDownRef.current = false;

    // Pill clicks are handled by VariableFromButton (stopPropagation + Configure toggle).
    // Don't treat them as chrome clicks or Actions would open/steal the toggle.
    if (isVariablePillClick) {
      setKeepCardActionsMenuOpen(editor, false);

      return;
    }

    // Switching from Configure Variable to Actions: close Configure (idempotent if Radix already
    // closed it on mousedown-outside), then bounce so Actions tippy remounts.
    if (switchingFromConfigure) {
      closeVariablePopover(editor);
      bounceCardButtonSelection();

      return;
    }

    // Second click on the button chrome closes Actions and clears the node selection.
    if (selected) {
      dismissCardActionsMenu(editor);

      return;
    }

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
        className="mly-inline-flex mly-max-w-full mly-cursor-pointer mly-select-none mly-items-center mly-justify-center mly-gap-0.5 mly-overflow-x-auto mly-no-scrollbar mly-rounded-md mly-px-3 mly-py-1 mly-text-sm mly-font-semibold mly-no-underline data-[selected=true]:mly-ring-2 data-[selected=true]:mly-ring-gray-400 data-[selected=true]:mly-ring-offset-1"
        style={
          {
            backgroundColor: preset.backgroundColor,
            color: preset.color,
            borderWidth: 2,
            borderStyle: 'solid',
            borderColor: preset.borderColor,
          } as CSSProperties
        }
        onPointerDownCapture={() => {
          // Radix dismisses Configure Variable on capture-phase pointerdown-outside, which runs
          // BEFORE our bubble-phase mousedown. Snapshot here so a chrome click that closes
          // Configure is still treated as "switch to Actions", not "toggle Actions off".
          configureOpenOnMouseDownRef.current = Boolean(editor.storage?.variable?.popover);
        }}
        onMouseDown={(event) => {
          // Prevent the div from taking focus on click (would hide the Actions bubble).
          event.preventDefault();
          // Button content is separate from the fields: a variable pill here opens Configure
          // Variable on its own (Actions bubble hidden), so don't keep the bubble underneath.
          setKeepCardActionsMenuOpen(editor, false);
        }}
        onClick={activateCardButton}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') {
            return;
          }

          event.preventDefault();
          activateCardButton();
        }}
      >
        {renderLiquidVariableSegments({
          value: label,
          provider: variableProvider,
          editor,
          from: 'button-variable',
          markVariablePills: true,
        })}
      </div>
    </NodeViewWrapper>
  );
}
