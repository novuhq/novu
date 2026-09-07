import { Editor } from '@tiptap/core';
import React from 'react';
import { RenderVariableOptions } from '../nodes/variable/variable';

export interface SuggestionItem {
  id: string;
  label?: string;
  data?: any;
}

export interface SuggestionProvider {
  name: string;
  triggerPattern: string | RegExp;
  getSuggestions: (query: string, editor: Editor) => SuggestionItem[] | Promise<SuggestionItem[]>;
  formatValue: (item: SuggestionItem) => string; // How to store the value
  renderValue: (value: string, editor: Editor, from: RenderVariableOptions['from']) => React.ReactNode; // How to display stored value
  isMatch: (value: string) => boolean; // Check if a value matches this provider's pattern
  /** Optional side-effect when a suggestion is chosen (e.g. create payload schema key). */
  onSelect?: (item: SuggestionItem, editor: Editor) => void;
}

export interface SuggestionContext {
  query: string;
  provider: SuggestionProvider;
  triggerIndex: number;
}

export type SuggestionProviderFactory = (editor: Editor) => SuggestionProvider | null;
