import { Editor } from '@tiptap/core';
import { ChevronsUpDown, ExternalLink, MousePointerClick, Plus, Trash2 } from 'lucide-react';
import { ReactNode } from 'react';
import {
  AllowedCardButtonStyle,
  allowedCardButtonStyle,
  CardButtonAttributes,
} from '@/editor/nodes/card-button/card-button';
import { useMailyContext } from '@/editor/provider';
import { cn } from '@/editor/utils/classname';
import { ButtonLabelInput } from '../../nodes/button/button-label-input';
import { Divider } from '../ui/divider';
import { Select } from '../ui/select';
import { useCardActionsState } from './use-card-actions-state';

const STYLE_LABELS: Record<AllowedCardButtonStyle, string> = {
  default: 'Default',
  primary: 'Primary',
  danger: 'Danger',
};

// Only redirect-url (link) buttons are supported today. The dropdown is kept for
// future action/postback button types.
const ACTION_TYPE_OPTIONS = [{ value: 'redirect-url', label: 'Redirect URL' }];

/** Shared chrome for Presets / Label / Action / URL controls (Figma maily-NumButton). */
const FIELD_CONTROL_CLASS =
  // max-h + overflow-hidden: variable pills can be taller than 24px; without this, flex
  // min-height:auto grows the row and shifts the form when switching buttons.
  'mly-box-border mly-h-6 mly-max-h-6 mly-min-h-6 mly-w-full mly-overflow-hidden mly-rounded mly-border mly-border-[#f2f5f8] mly-bg-soft-gray mly-px-1.5 mly-text-xs mly-font-medium mly-text-[#0e121b] hover:mly-bg-soft-gray focus:mly-border-[#c1c7d0] focus:mly-bg-soft-gray focus:mly-outline-none focus-visible:mly-border-[#c1c7d0] focus-visible:mly-ring-0';

// Blocking validation error border; last in `cn` so tailwind-merge overrides the default border color.
const FIELD_ERROR_CLASS =
  'mly-border-red-500 focus:mly-border-red-500 focus-visible:mly-border-red-500 hover:mly-border-red-500';

export function CardActionsBubbleMenuContent({ editor }: { editor: Editor }) {
  const state = useCardActionsState(editor);
  const { validateCardButtonField } = useMailyContext();

  if (!state.isActive) {
    return null;
  }

  const activeButton = state.buttons[state.activeIndex];

  if (!activeButton) {
    return null;
  }

  const labelError = validateCardButtonField?.('label', activeButton.label, activeButton.isLabelVariable) ?? null;
  const urlError = validateCardButtonField?.('url', activeButton.url, activeButton.isUrlVariable) ?? null;

  const updateActiveButton = (attrs: Partial<CardButtonAttributes>) => {
    editor.chain().selectCardButton(state.activeIndex).updateCardButtonAttributes(attrs).run();
  };

  return (
    <div className="mly-flex mly-w-[292px] mly-flex-col mly-gap-0.5 mly-text-[#0e121b]">
      <div className="mly-flex mly-max-h-5 mly-items-center mly-gap-2 mly-overflow-hidden mly-rounded mly-py-0.5 mly-pl-0.5 mly-pr-1">
        <div className="mly-flex mly-min-w-0 mly-flex-1 mly-items-center mly-gap-1">
          <MousePointerClick className="mly-size-3.5 mly-shrink-0" strokeWidth={2} />
          <span className="mly-text-xs mly-font-medium mly-leading-4">Actions</span>
        </div>
        <ChevronsUpDown className="mly-size-2.5 mly-shrink-0 mly-text-[#99a0ae]" strokeWidth={2} aria-hidden />
      </div>

      <div className="mly-flex mly-flex-col mly-gap-1 mly-pl-1 mly-pr-1">
        <div className="mly-flex mly-items-center mly-gap-2 mly-py-1">
          <div className="mly-flex mly-items-start mly-gap-px mly-rounded-[5px] mly-bg-soft-gray mly-p-px">
            {state.buttons.map((_, index) => {
              const isActive = index === state.activeIndex;

              return (
                <button
                  key={index}
                  type="button"
                  data-state={isActive}
                  className={cn(
                    'mly-shrink-0 mly-rounded mly-border mly-border-transparent mly-py-1 mly-pl-1.5 mly-pr-2 mly-text-xs mly-font-medium mly-leading-4 mly-text-[#525866]',
                    isActive &&
                      'mly-border-[#e1e4ea] mly-bg-white mly-text-[#0e121b] mly-shadow-[0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.04)]'
                  )}
                  onClick={() => editor.commands.selectCardButton(index)}
                >
                  Button {index + 1}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={!state.canAddButton}
            className="mly-flex mly-shrink-0 mly-items-center mly-gap-1 mly-text-xs mly-font-medium mly-leading-4 mly-text-[#525866] hover:mly-text-[#0e121b] disabled:mly-cursor-not-allowed disabled:mly-opacity-40"
            onClick={() => editor.commands.addCardButton()}
          >
            <Plus className="mly-size-[15px] mly-stroke-[2]" />
            Add button
          </button>
        </div>

        <Divider type="horizontal" className="mly-mx-0 mly-bg-[#f2f5f8]" />

        <div className="mly-flex mly-flex-col mly-gap-1.5">
          <FieldRow label="Presets">
            <Select
              label="Presets"
              value={activeButton.style}
              options={allowedCardButtonStyle.map((value) => ({ value, label: STYLE_LABELS[value] }))}
              onValueChange={(value) => updateActiveButton({ style: value as AllowedCardButtonStyle })}
              fullWidth
              portalled={false}
              className={FIELD_CONTROL_CLASS}
              chevronClassName="mly-size-2.5 mly-text-[#99a0ae]"
            />
          </FieldRow>

          <FieldRow label="Label" error={labelError}>
            <ButtonLabelInput
              key={`label-${state.activeIndex}`}
              value={activeButton.label}
              isVariable={activeButton.isLabelVariable}
              editor={editor}
              wrapVariablesInLiquid
              placeholder="Button"
              className={cn(FIELD_CONTROL_CLASS, labelError && FIELD_ERROR_CLASS)}
              onValueChange={(value, isVariable) =>
                updateActiveButton({ label: value, isLabelVariable: isVariable ?? false })
              }
            />
          </FieldRow>

          <FieldRow label="Action">
            <Select
              label="Action"
              value="redirect-url"
              options={ACTION_TYPE_OPTIONS}
              onValueChange={() => {}}
              fullWidth
              portalled={false}
              icon={ExternalLink}
              iconClassName="mly-size-3 mly-text-[#525866]"
              className={FIELD_CONTROL_CLASS}
              chevronClassName="mly-size-2.5 mly-text-[#99a0ae]"
            />
          </FieldRow>

          <Divider type="horizontal" className="mly-mx-0 mly-bg-[#f2f5f8]" />

          <FieldRow label="URL" error={urlError}>
            <ButtonLabelInput
              key={`url-${state.activeIndex}`}
              value={activeButton.url}
              isVariable={activeButton.isUrlVariable}
              editor={editor}
              enabledProviders={['variable']}
              wrapVariablesInLiquid
              placeholder="https://google.com"
              className={cn(FIELD_CONTROL_CLASS, urlError && FIELD_ERROR_CLASS)}
              onValueChange={(value, isVariable) =>
                updateActiveButton({ url: value, isUrlVariable: isVariable ?? false })
              }
            />
          </FieldRow>
        </div>

        <Divider type="horizontal" className="mly-mx-0 mly-bg-[#f2f5f8]" />

        <button
          type="button"
          className="mly-flex mly-items-center mly-gap-1.5 mly-rounded mly-px-0.5 mly-py-1 mly-text-xs mly-font-medium mly-text-red-600 hover:mly-bg-soft-gray"
          onClick={() => editor.commands.removeCardButton(state.activeIndex)}
        >
          <Trash2 className="mly-size-3.5" />
          Remove button
        </button>
      </div>
    </div>
  );
}

function FieldRow({ label, error, children }: { label: string; error?: string | null; children: ReactNode }) {
  return (
    <div className="mly-flex mly-w-full mly-flex-col mly-gap-1">
      <div className="mly-flex mly-w-full mly-items-center mly-justify-center mly-gap-3">
        <span className="mly-w-[50px] mly-shrink-0 mly-text-xs mly-font-medium mly-leading-4 mly-text-[#525866]">
          {label}
        </span>
        <div className="mly-flex mly-min-w-0 mly-flex-1 mly-items-center">{children}</div>
      </div>
      {error ? (
        // Align the message under the control column (50px label + 12px gap).
        <span className="mly-pl-[62px] mly-text-[11px] mly-font-medium mly-leading-3 mly-text-red-600">{error}</span>
      ) : null}
    </div>
  );
}
