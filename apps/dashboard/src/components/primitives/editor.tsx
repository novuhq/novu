import { autocompleteFooter, autocompleteHeader, functionIcon } from '@/components/primitives/constants';
import { useDataRef } from '@/hooks/use-data-ref';
import { tags as t } from '@lezer/highlight';
import createTheme from '@uiw/codemirror-themes';
import {
  default as CodeMirror,
  EditorView,
  ReactCodeMirrorProps,
  type ReactCodeMirrorRef,
} from '@uiw/react-codemirror';
import { cva } from 'class-variance-authority';
import React, { useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';

const variants = cva('h-full w-full flex-1 [&_.cm-focused]:outline-none', {
  variants: {
    size: {
      md: 'text-base',
      sm: 'text-xs',
      '2xs': 'text-xs',
    },
  },
  defaultVariants: {
    size: 'sm',
  },
});

const baseTheme = (options: { multiline?: boolean }) =>
  EditorView.baseTheme({
    '&light': {
      backgroundColor: 'transparent',
    },
    ...(!options.multiline
      ? {
          '.cm-scroller': {
            overflow: 'hidden',
          },
        }
      : {}),
    '.cm-tooltip-autocomplete .cm-completionIcon-variable': {
      '&:before': {
        content: 'Suggestions',
      },
      '&:after': {
        content: "''",
        height: '16px',
        width: '16px',
        display: 'block',
        backgroundRepeat: 'no-repeat',
        backgroundImage: `url('${functionIcon}')`,
      },
    },
    '.cm-tooltip-autocomplete.cm-tooltip': {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 'var(--radius)',
      border: '1px solid var(--neutral-100)',
      backgroundColor: 'hsl(var(--background))',
      boxShadow: '0px 1px 3px 0px rgba(16, 24, 40, 0.10), 0px 1px 2px 0px rgba(16, 24, 40, 0.06)',
      '&:before': {
        content: "''",
        top: '0',
        left: '0',
        right: '0',
        height: '30px',
        display: 'block',
        backgroundRepeat: 'no-repeat',
        backgroundImage: `url('${autocompleteHeader}')`,
      },
      '&:after': {
        content: "''",
        bottom: '30px',
        left: '0',
        right: '0',
        height: '30px',
        display: 'block',
        backgroundRepeat: 'no-repeat',
        backgroundImage: `url('${autocompleteFooter}')`,
      },
    },
    '.cm-tooltip-autocomplete.cm-tooltip > ul[role="listbox"]': {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      maxHeight: '12rem',
      margin: '4px 0',
      padding: '4px',
    },
    '.cm-tooltip-autocomplete.cm-tooltip > ul > li[role="option"]': {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '4px',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '12px',
      fontWeight: '500',
      lineHeight: '16px',
      minHeight: '24px',
      color: 'var(--foreground-950)',
      borderRadius: 'calc(var(--radius) - 2px)',
    },
    '.cm-tooltip-autocomplete.cm-tooltip > ul > li[aria-selected="true"]': {
      backgroundColor: 'hsl(var(--neutral-100))',
    },
    '.cm-tooltip-autocomplete.cm-tooltip .cm-completionIcon': {
      padding: '0',
      width: '16px',
      height: '16px',
    },
    '.cm-line span.cm-matchingBracket': {
      backgroundColor: 'hsl(var(--highlighted) / 0.1)',
    },
    // important to show the cursor at the beginning of the line
    '.cm-line': {
      marginLeft: '1px',
    },
    'div.cm-content': {
      padding: 0,
      whiteSpace: 'preserve nowrap',
      width: '1px', // Any width value would do to make the editor work exactly like an input when more text than its width is added
    },
    'div.cm-gutters': {
      backgroundColor: 'transparent',
      borderRight: 'none',
      color: 'hsl(var(--foreground-400))',
    },
    '.cm-placeholder': {
      fontWeight: 'normal',
    },
  });

export type EditorProps = {
  value: string;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
  height?: string;
  onChange?: (value: string) => void;
  fontFamily?: 'inherit';
  size?: 'sm' | 'md' | '2xs';
} & ReactCodeMirrorProps;

export const Editor = React.forwardRef<ReactCodeMirrorRef, EditorProps>(
  (
    {
      value,
      placeholder,
      className,
      height,
      multiline = false,
      fontFamily,
      onChange,
      size = 'sm',
      extensions: extensionsProp,
      basicSetup: basicSetupProp,
      ...restCodeMirrorProps
    },
    ref
  ) => {
    const onChangeRef = useDataRef(onChange);
    const extensions = useMemo(
      () => [...(extensionsProp ?? []), baseTheme({ multiline })],
      [extensionsProp, multiline]
    );

    const basicSetup = useMemo(
      () => ({
        lineNumbers: false,
        foldGutter: false,
        highlightActiveLine: false,
        defaultKeymap: multiline,
        ...((typeof basicSetupProp === 'object' ? basicSetupProp : {}) ?? {}),
      }),
      [basicSetupProp, multiline]
    );

    const theme = useMemo(
      () =>
        createTheme({
          theme: 'light',
          styles: [
            { tag: t.keyword, color: 'hsl(var(--feature))' },
            { tag: t.string, color: 'hsl(var(--highlighted))' },
            { tag: t.function(t.variableName), color: 'hsl(var(--information))' },
          ],
          settings: {
            background: 'transparent',
            fontFamily: fontFamily === 'inherit' ? 'inherit' : undefined,
          },
        }),
      [fontFamily]
    );

    const onChangeCallback = useCallback(
      (value: string) => {
        // when typing fast the onChange event is called multiple times during one render phase
        // by default react batches state updates and only triggers one render phase
        // which results in value not being updated and "jumping" effect in the editor
        // to prevent this we need to flush the state updates synchronously
        flushSync(() => {
          onChangeRef.current?.(value);
        });
      },
      [onChangeRef]
    );

    return (
      <CodeMirror
        ref={ref}
        className={variants({ size, className })}
        extensions={extensions}
        height={height}
        placeholder={placeholder}
        basicSetup={basicSetup}
        value={value}
        onChange={onChangeCallback}
        theme={theme}
        {...restCodeMirrorProps}
      />
    );
  }
);
