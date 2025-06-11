import {
  autocompleteFooter,
  autocompleteHeader,
  codeIcon,
  digestIcon,
  functionIcon,
  keyIcon,
} from '@/components/primitives/constants';
import { useDataRef } from '@/hooks/use-data-ref';
import { tags as t } from '@lezer/highlight';
import createTheme from '@uiw/codemirror-themes';
import { type TagStyle } from '@codemirror/language';

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
      md: 'text-sm',
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
    ...(options.multiline
      ? {}
      : {
          '.cm-scroller': {
            overflow: 'hidden',
          },
        }),
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
    '.cm-tooltip-autocomplete .cm-completionIcon-type': {
      '&:before': {
        content: 'Suggestions',
      },
      '&:after': {
        content: "''",
        height: '14px',
        width: '14px',
        display: 'block',
        backgroundRepeat: 'no-repeat',
        backgroundImage: `url('${codeIcon}')`,
        backgroundPosition: 'center',
      },
    },
    '.cm-tooltip-autocomplete .cm-completionIcon-keyword': {
      '&:before': {
        content: 'Suggestions',
      },
      '&:after': {
        content: "''",
        height: '14px',
        width: '14px',
        display: 'block',
        backgroundRepeat: 'no-repeat',
        backgroundImage: `url('${keyIcon}')`,
        backgroundPosition: 'center',
      },
    },
    '.cm-tooltip-autocomplete .cm-completionIcon-digest': {
      '&:before': {
        content: 'Suggestions',
      },
      '&:after': {
        content: "''",
        height: '16px',
        width: '16px',
        display: 'block',
        backgroundRepeat: 'no-repeat',
        backgroundImage: `url('${digestIcon}')`,
      },
    },
    '.cm-tooltip-autocomplete.cm-tooltip': {
      position: 'relative',
      overflow: 'visible',
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
      lineHeight: '20px',
    },
    'div.cm-content': {
      padding: 0,
      ...(options.multiline
        ? {
            whiteSpace: 'pre-wrap',
            width: '100%',
          }
        : {
            whiteSpace: 'preserve nowrap',
            width: '1px', // Any width value would do to make the editor work exactly like an input when more text than its width is added
          }),
    },
    'div.cm-gutters': {
      backgroundColor: 'transparent',
      borderRight: 'none',
      color: 'hsl(var(--foreground-400))',
    },
    '.cm-placeholder': {
      fontWeight: 'normal',
    },
    '.cm-tooltip .cm-completionInfo': {
      marginInline: '0.375rem',
      borderRadius: '0.5rem',
      boxShadow: '0px 1px 3px 0px rgba(16, 24, 40, 0.10), 0px 1px 2px 0px rgba(16, 24, 40, 0.06)',
      borderColor: 'transparent',
      padding: '0px !important',
      backgroundColor: 'hsl(var(--bg-weak))',
    },
    '.cm-tooltip-autocomplete.cm-tooltip > ul > li:hover': {
      backgroundColor: 'hsl(var(--neutral-100))',
    },
    // Style for the "Create:" prefix on new variable suggestions
    '.cm-new-variable-option .cm-completionLabel': {
      fontWeight: '500',
      '&::before': {
        content: "'create: '",
        color: 'hsl(var(--foreground-400))',
        marginRight: '0.33em',
      },
    },
    // Style for the icon on new variable suggestions
    '.cm-new-variable-option .cm-completionIcon': {
      '&::after': {
        content: "''",
        height: '16px',
        width: '16px',
        display: 'block',
        backgroundRepeat: 'no-repeat',
        backgroundImage: `url('${functionIcon}')`,
      },
    },
    // Adding tooltip content for new variable options
    '.cm-new-variable-option.cm-completion': {
      '&[data-has-info=true] ~ .cm-tooltip .cm-completionInfo': {
        padding: '12px !important',
        minHeight: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '14px',
        fontWeight: '500',
        color: 'hsl(var(--foreground-950))',
      },
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
  foldGutter?: boolean;
  lineNumbers?: boolean;
  tagStyles?: TagStyle[];
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
      lineNumbers = false,
      tagStyles,
      foldGutter = false,
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
        lineNumbers,
        foldGutter,
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
        defaultKeymap: multiline,
        ...((typeof basicSetupProp === 'object' ? basicSetupProp : {}) ?? {}),
      }),
      [basicSetupProp, multiline, lineNumbers, foldGutter]
    );

    const theme = useMemo(
      () =>
        createTheme({
          theme: 'light',
          styles: [
            { tag: t.keyword, color: 'hsl(var(--feature))' },
            { tag: t.string, color: 'hsl(var(--highlighted))' },
            { tag: t.function(t.variableName), color: 'hsl(var(--information))' },
            ...(tagStyles ?? []),
          ],
          settings: {
            background: 'transparent',
            fontFamily: fontFamily === 'inherit' ? 'inherit' : undefined,
          },
        }),
      [fontFamily, tagStyles]
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
        height="auto"
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
