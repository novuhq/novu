import { EditorView } from '@uiw/react-codemirror';
import { VARIABLE_PILL_CLASS } from '.';

export const variablePillTheme = EditorView.baseTheme({
  [`.${VARIABLE_PILL_CLASS} .cm-bracket`]: {
    display: 'none',
  },
  '.cm-content': {
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  '.cm-line': {
    paddingLeft: 0,
  },
});
