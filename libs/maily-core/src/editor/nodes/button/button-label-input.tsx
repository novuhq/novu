import { Editor } from '@tiptap/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SuggestionInput, useMatchingProvider, useSuggestionProviders } from '@/editor/bubble-suggestions';
import { DEFAULT_PLACEHOLDER_URL, useMailyContext } from '@/editor/provider';
import { cn } from '@/editor/utils/classname';
import {
  hasLiquidExpression,
  renderLiquidVariableSegments,
  setKeepCardActionsMenuOpen,
  VARIABLE_PILL_MARKER_ATTR,
} from '@/editor/utils/liquid-variables';

type ButtonLabelInputProps = {
  value: string;
  onValueChange?: (value: string, isFromSuggestion?: boolean) => void;
  isVariable?: boolean;
  enabledProviders?: string[];
  editor: Editor;
  className?: string;
  /** Overrides the default URL placeholder from Maily context (e.g. "Button" for card labels). */
  placeholder?: string;
  /**
   * When true, a picked variable is stored as an explicit `{{ path }}` liquid expression (the only
   * valid variable format for chat card buttons) with the variable flag off. When false (default,
   * e.g. the email button), a pure variable is stored as the bare path + variable flag and shown as
   * a pill, matching the established maily convention.
   */
  wrapVariablesInLiquid?: boolean;
};

export function ButtonLabelInput(props: ButtonLabelInputProps) {
  const {
    value,
    onValueChange,
    isVariable,
    enabledProviders = ['variable', 'inlineDecorator'],
    editor,
    className,
    placeholder: placeholderProp,
    wrapVariablesInLiquid = false,
  } = props;

  const linkInputRef = useRef<HTMLInputElement>(null);
  const isFullWidth = Boolean(className && /\bmly-w-full\b/.test(className));

  const { placeholderUrl = DEFAULT_PLACEHOLDER_URL } = useMailyContext();
  const placeholder = placeholderProp ?? placeholderUrl;

  const providers = useSuggestionProviders(editor, enabledProviders);
  const matchingProvider = useMatchingProvider(value, providers);
  const variableProvider = useMemo(
    () => providers.find((provider) => provider.name === 'variable') ?? null,
    [providers]
  );

  // What makes the field collapse into a (click-to-edit) pill view depends on the mode:
  // - card buttons: the value contains a `{{ ... }}` expression (rendered as inline pills + text)
  // - email button: the bare-path value is flagged as a variable (legacy single-pill convention)
  const isPillEligible = wrapVariablesInLiquid ? hasLiquidExpression(value) : Boolean(isVariable);
  const canRenderPill = wrapVariablesInLiquid ? !!variableProvider : !!matchingProvider;

  const [isEditing, setIsEditing] = useState(!isPillEligible);

  // Email button: reflect the variable flag so it collapses to a pill on selection. Card buttons
  // collapse on blur instead (see `onOutsideClick`), so typing a text + variable combination isn't
  // interrupted mid-edit; their collapsed/expanded state is seeded on mount and on button-switch
  // remount (the field is keyed by the active button index).
  useEffect(() => {
    if (!wrapVariablesInLiquid) {
      setIsEditing(!isVariable);
    }
  }, [isVariable, wrapVariablesInLiquid]);

  const enterEditMode = () => {
    setIsEditing(true);
    setTimeout(() => {
      linkInputRef.current?.focus();
    }, 0);
  };

  const showPill = !isEditing && isPillEligible && canRenderPill;

  if (showPill) {
    return (
      // Collapsed pill view. Card buttons render interactive `{{ }}` pills: clicking a pill opens
      // Configure Variable on top of the Actions bubble (the pill's mousedown flags the bubble to
      // stay mounted), while clicking the surrounding text enters raw edit. The email button keeps a
      // single display-only pill (`bubble-variable`) that is always click-to-edit.
      <button
        type="button"
        className={cn(
          'mly-box-border mly-flex mly-h-6 mly-max-h-6 mly-min-h-6 mly-min-w-0 mly-items-center mly-rounded mly-px-1.5',
          isFullWidth && 'mly-w-full',
          className,
          // Scroll long variable+text mixes horizontally; hide the scrollbar (wheel/trackpad/drag).
          wrapVariablesInLiquid && 'mly-overflow-x-auto mly-overflow-y-hidden mly-no-scrollbar'
        )}
        onMouseDown={(event) => {
          if (wrapVariablesInLiquid && (event.target as HTMLElement).closest(`[${VARIABLE_PILL_MARKER_ATTR}]`)) {
            // Runs before the pill's click opens the popover, so the Actions bubble's `shouldShow`
            // (re-evaluated on the popover-open transaction) keeps it visible underneath.
            setKeepCardActionsMenuOpen(editor, true);
          }
        }}
        onClick={(event) => {
          if (wrapVariablesInLiquid && (event.target as HTMLElement).closest(`[${VARIABLE_PILL_MARKER_ATTR}]`)) {
            return;
          }

          enterEditMode();
        }}
      >
        <span
          className={cn(
            'mly-flex mly-h-full mly-max-h-full mly-min-h-0 mly-items-center mly-gap-0.5',
            wrapVariablesInLiquid ? 'mly-w-max mly-min-w-full mly-shrink-0' : 'mly-min-w-0 mly-overflow-hidden'
          )}
        >
          {wrapVariablesInLiquid
            ? renderLiquidVariableSegments({
                value,
                provider: variableProvider,
                editor,
                from: 'button-variable',
                markVariablePills: true,
              })
            : matchingProvider?.renderValue(value, editor, 'bubble-variable')}
        </span>
      </button>
    );
  }

  return (
    // Keep the field shell at h-6 so pill ↔ input swaps don't shift the form.
    // Autocomplete is portaled/absolute below the input — only the input is clipped.
    <div className={cn('mly-relative mly-h-6 mly-max-h-6 mly-min-h-6 mly-min-w-0', isFullWidth && 'mly-w-full')}>
      <SuggestionInput
        editor={editor}
        value={value}
        onValueChange={(next) => {
          onValueChange?.(next);
        }}
        enabledProviders={enabledProviders}
        ref={linkInputRef}
        placeholder={placeholder}
        containerClassName={cn('mly-h-full', isFullWidth && 'mly-w-full')}
        className={cn(
          'mly-box-border mly-h-6 mly-max-h-6 mly-w-40 mly-rounded-md mly-px-2 mly-text-sm mly-text-midnight-gray hover:mly-bg-soft-gray focus:mly-bg-soft-gray focus:mly-outline-none',
          className
        )}
        onSelectSuggestion={(provider, item, formattedValue) => {
          // Only the variable picker inserts liquid variables. Other providers (e.g. the email
          // button inline decorator) keep replacing the whole value.
          if (provider.name !== 'variable') {
            setIsEditing(false);
            onValueChange?.(formattedValue, true);

            return;
          }

          const variablePath = provider.formatValue(item);
          const prefix = formattedValue.slice(0, formattedValue.length - variablePath.length);

          // Card buttons: the only valid variable format is an explicit `{{ path }}` liquid
          // expression, stored as plain text (isVariable=false) for both a pure variable (empty
          // prefix) and a text + variable combination. A later liquid render resolves it.
          // Do not insert a leading space before `{{` — URLs like `?q={{ payload.foo }}` must stay
          // contiguous; pill spacing in the collapsed view is handled with CSS gap instead.
          if (wrapVariablesInLiquid) {
            onValueChange?.(`${prefix}{{ ${variablePath} }}`, false);

            return;
          }

          // Email button (legacy pill convention): a pure variable is the bare path + variable flag
          // (rendered as a pill, wrapped to `{{ }}` at delivery); a text + variable combination
          // embeds the variable inline so it isn't wrapped into an invalid `{{ text path }}`.
          if (!prefix) {
            setIsEditing(false);
            onValueChange?.(variablePath, true);

            return;
          }

          onValueChange?.(`${prefix}{{ ${variablePath} }}`, false);
        }}
        onOutsideClick={() => {
          // Collapse back into the pill view when the value is a variable (card: contains `{{ }}`;
          // email: flagged bare path). Plain text stays as an editable input.
          if (isPillEligible && canRenderPill) {
            setIsEditing(false);
          }
        }}
      />
    </div>
  );
}
