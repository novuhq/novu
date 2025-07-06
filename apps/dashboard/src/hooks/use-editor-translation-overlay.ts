import { useCallback, useEffect, useState } from 'react';
import { EditorView } from '@uiw/react-codemirror';
import { FeatureFlagsKeysEnum } from '@novu/shared';

import { CompletionRange } from '@/components/primitives/variable-editor';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useTranslationCompletionSource } from '@/hooks/use-translation-completion-source';
import { useTranslationPluginExtension } from '@/hooks/use-translation-plugin-extension';
import { TRANSLATION_PILL_HEIGHT } from '@/components/primitives/translation-plugin/constants';
import { WorkflowResponseDto } from '@novu/shared';

type UseTranslationEditorProps = {
  viewRef: React.MutableRefObject<EditorView | null>;
  lastCompletionRef: React.MutableRefObject<CompletionRange | null>;
  onChange: (value: string) => void;
  workflow: WorkflowResponseDto | undefined;
  enableTranslations?: boolean;
};

export function useEditorTranslationOverlay({
  viewRef,
  lastCompletionRef,
  onChange,
  workflow,
  enableTranslations = false,
}: UseTranslationEditorProps) {
  const isTranslationEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_TRANSLATION_ENABLED);
  const shouldEnableTranslations = isTranslationEnabled && enableTranslations;

  const [translationTriggerPosition, setTranslationTriggerPosition] = useState<{ top: number; left: number } | null>(
    null
  );

  const translationCompletionSource = useTranslationCompletionSource({ workflow });

  const {
    selectedTranslation,
    setSelectedTranslation,
    handleTranslationDelete,
    handleTranslationReplaceKey,
    translationPluginExtension,
  } = useTranslationPluginExtension({
    viewRef,
    lastCompletionRef,
    onChange,
    workflow,
    shouldEnableTranslations,
  });

  const handleTranslationPopoverOpenChange = useCallback(
    (open: boolean) => {
      if (!shouldEnableTranslations) return;

      if (!open) {
        setTimeout(() => setSelectedTranslation(null), 0);
        viewRef.current?.focus();
      }
    },
    [viewRef, setSelectedTranslation, shouldEnableTranslations]
  );

  useEffect(() => {
    // Calculate translation popover position when translation is selected
    if (shouldEnableTranslations && selectedTranslation && viewRef.current) {
      const coords = viewRef.current.coordsAtPos(selectedTranslation.from);

      if (coords) {
        const topOffset = TRANSLATION_PILL_HEIGHT + 4; // Small offset below the pill
        setTranslationTriggerPosition({
          top: coords.top + topOffset,
          left: coords.left,
        });
      }
    } else {
      setTranslationTriggerPosition(null);
    }
  }, [selectedTranslation, shouldEnableTranslations, viewRef]);

  const isTranslationPopoverOpen = shouldEnableTranslations && !!selectedTranslation;

  return {
    translationCompletionSource,
    translationPluginExtension,
    selectedTranslation,
    setSelectedTranslation,
    handleTranslationDelete,
    handleTranslationReplaceKey,
    handleTranslationPopoverOpenChange,
    translationTriggerPosition,
    isTranslationPopoverOpen,
    shouldEnableTranslations,
  };
}
