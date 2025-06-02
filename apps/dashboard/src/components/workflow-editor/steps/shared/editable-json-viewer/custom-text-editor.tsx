import { Editor } from '@/components/primitives/editor';
import { CustomTextEditorProps } from './types';
import { JSON_EXTENSIONS, BASIC_SETUP } from './constants';

export function CustomTextEditor({ value, onChange, onKeyDown }: CustomTextEditorProps) {
  return (
    <Editor
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      lang="javascript"
      extensions={JSON_EXTENSIONS}
      basicSetup={BASIC_SETUP}
      multiline
      className="min-h-[200px] overflow-auto rounded border border-neutral-300"
    />
  );
}
