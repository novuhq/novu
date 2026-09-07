import { EditorView } from '@uiw/react-codemirror';
import { MutableRefObject } from 'react';
import { IsAllowedVariable } from '@/utils/parseStepVariables';

export type PluginState = {
  viewRef: MutableRefObject<EditorView | null>;
  lastCompletionRef: MutableRefObject<{ from: number; to: number } | null>;
  onSelect?: (value: string, from: number, to: number) => void;
  isAllowedVariable: IsAllowedVariable;
  isDigestEventsVariable?: (variableName: string) => boolean;
  getVariableErrorMessage?: (variableName: string, isAllowed: boolean) => string | undefined;
};
