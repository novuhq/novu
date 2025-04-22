import { IsAllowedVariable } from '@/utils/parseStepVariables';
import { EditorView } from '@uiw/react-codemirror';
import { MutableRefObject } from 'react';

export type PluginState = {
  viewRef: MutableRefObject<EditorView | null>;
  lastCompletionRef: MutableRefObject<{ from: number; to: number } | null>;
  onSelect?: (value: string, from: number, to: number) => void;
  isAllowedVariable: IsAllowedVariable;
  isEnhancedDigestEnabled: boolean;
  isDigestEventsVariable?: (variableName: string) => boolean;
};
