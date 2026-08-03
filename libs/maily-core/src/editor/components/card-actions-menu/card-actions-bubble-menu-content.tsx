import { Editor } from '@tiptap/core';
import { MousePointerClick, Plus, Trash2 } from 'lucide-react';
import { ReactNode } from 'react';
import {
  AllowedCardButtonStyle,
  allowedCardButtonStyle,
  CardButtonAttributes,
} from '@/editor/nodes/card-button/card-button';
import { cn } from '@/editor/utils/classname';
import { ButtonLabelInput } from '../../nodes/button/button-label-input';
import { Divider } from '../ui/divider';
import { Select } from '../ui/select';
import { CardActionsUrlInput } from './card-actions-url-input';
import { useCardActionsState } from './use-card-actions-state';

const STYLE_LABELS: Record<AllowedCardButtonStyle, string> = {
  default: 'Default',
  primary: 'Primary',
  danger: 'Danger',
};

// Only redirect-url (link) buttons are supported today. The dropdown is kept for
// future action/postback button types.
const ACTION_TYPE_OPTIONS = [{ value: 'redirect-url', label: 'Redirect URL' }];

export function CardActionsBubbleMenuContent({ editor }: { editor: Editor }) {
  const state = useCardActionsState(editor);

  if (!state.isActive) {
    return null;
  }

  const activeButton = state.buttons[state.activeIndex];

  if (!activeButton) {
    return null;
  }

  const updateActiveButton = (attrs: Partial<CardButtonAttributes>) => {
    editor.chain().selectCardButton(state.activeIndex).updateCardButtonAttributes(attrs).run();
  };

  return (
    <div className="mly-flex mly-w-72 mly-flex-col mly-gap-2 mly-p-1 mly-text-midnight-gray">
      <div className="mly-flex mly-items-center mly-gap-1.5 mly-px-1">
        <MousePointerClick className="mly-size-3.5 mly-shrink-0" />
        <span className="mly-text-sm mly-font-medium">Actions</span>
      </div>

      <div className="mly-flex mly-items-center mly-gap-1">
        <div className="mly-flex mly-min-w-0 mly-flex-1 mly-items-center mly-gap-0.5 mly-overflow-x-auto mly-rounded-md mly-bg-soft-gray mly-p-0.5">
          {state.buttons.map((_, index) => (
            <button
              key={index}
              type="button"
              data-state={index === state.activeIndex}
              className={cn(
                'mly-shrink-0 mly-rounded mly-px-2 mly-py-0.5 mly-text-xs mly-font-medium mly-text-slate-600 hover:mly-text-midnight-gray',
                'data-[state=true]:mly-bg-white data-[state=true]:mly-text-midnight-gray data-[state=true]:mly-shadow-sm'
              )}
              onClick={() => editor.commands.selectCardButton(index)}
            >
              Button {index + 1}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={!state.canAddButton}
          className="mly-flex mly-shrink-0 mly-items-center mly-gap-1 mly-rounded-md mly-px-1.5 mly-py-1 mly-text-xs mly-font-medium mly-text-slate-600 hover:mly-bg-soft-gray disabled:mly-cursor-not-allowed disabled:mly-opacity-50"
          onClick={() => editor.commands.addCardButton()}
        >
          <Plus className="mly-size-3.5 mly-stroke-[2.5]" />
          Add button
        </button>
      </div>

      <Divider type="horizontal" className="mly-mx-0" />

      <FieldRow label="Presets">
        <Select
          label="Presets"
          value={activeButton.style}
          options={allowedCardButtonStyle.map((value) => ({ value, label: STYLE_LABELS[value] }))}
          onValueChange={(value) => updateActiveButton({ style: value as AllowedCardButtonStyle })}
        />
      </FieldRow>

      <FieldRow label="Label">
        <ButtonLabelInput
          value={activeButton.label}
          isVariable={activeButton.isLabelVariable}
          editor={editor}
          onValueChange={(value, isVariable) =>
            updateActiveButton({ label: value, isLabelVariable: isVariable ?? false })
          }
        />
      </FieldRow>

      <FieldRow label="Action">
        <Select label="Action" value="redirect-url" options={ACTION_TYPE_OPTIONS} onValueChange={() => {}} />
      </FieldRow>

      <FieldRow label="URL">
        <CardActionsUrlInput
          value={activeButton.url}
          isVariable={activeButton.isUrlVariable}
          editor={editor}
          onValueChange={(value, isVariable) => updateActiveButton({ url: value, isUrlVariable: isVariable ?? false })}
        />
      </FieldRow>

      <Divider type="horizontal" className="mly-mx-0" />

      <button
        type="button"
        className="mly-flex mly-items-center mly-gap-1.5 mly-rounded-md mly-px-1.5 mly-py-1 mly-text-xs mly-font-medium mly-text-red-600 hover:mly-bg-soft-gray"
        onClick={() => editor.commands.removeCardButton(state.activeIndex)}
      >
        <Trash2 className="mly-size-3.5" />
        Remove button
      </button>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mly-flex mly-items-center mly-gap-2">
      <span className="mly-w-16 mly-shrink-0 mly-text-xs mly-text-slate-500">{label}</span>
      <div className="mly-flex mly-min-w-0 mly-flex-1 mly-items-center">{children}</div>
    </div>
  );
}
