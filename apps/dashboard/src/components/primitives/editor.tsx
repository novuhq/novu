import { type TagStyle } from '@codemirror/language';
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
import {
  autocompleteFooter,
  autocompleteHeader,
  codeIcon,
  digestIcon,
  functionIcon,
  keyIcon,
} from '@/components/primitives/constants';
import { useDataRef } from '@/hooks/use-data-ref';

const variants = cva('h-full w-full flex-1 [&>.cm-focused]:outline-hidden!', {
  variants: {
    size: {
      md: 'text-sm',
      sm: 'text-xs',
      '2xs': 'text-xs',
      '3xs': 'text-xs',
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
    },
    'div.cm-gutters': {
      backgroundColor: 'transparent',
      borderRight: 'none',
      color: 'hsl(var(--foreground-400))',
    },
    '.cm-placeholder': {
      fontWeight: 'normal',
    },
    '.cm-tooltip-autocomplete .cm-completionIcon-variable, .cm-tooltip-autocomplete .cm-completionIcon-local, .cm-tooltip-autocomplete .cm-completionIcon-property':
      {
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
      maxWidth: '250px',
      minWidth: '250px',
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
      width: '100%',
      overflowY: 'auto',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      '&::-webkit-scrollbar': {
        display: 'none',
      },
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
      width: '100%',
      maxWidth: '100%',
      overflow: 'hidden',
    },
    '.cm-tooltip-autocomplete.cm-tooltip > ul > li[role="option"] .cm-completionLabel': {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      flex: '1',
      minWidth: '0',
    },
    '.cm-tooltip-autocomplete.cm-tooltip > ul > li[aria-selected="true"]': {
      backgroundColor: 'hsl(var(--neutral-100))',
    },
    '.cm-tooltip-autocomplete.cm-tooltip .cm-completionIcon': {
      padding: '0',
      width: '16px',
      height: '16px',
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
    // Style for translation completions
    '.cm-tooltip-autocomplete .cm-completionIcon-translation': {
      '&:before': {
        content: 'Translations',
      },
      '&:after': {
        content: "''",
        height: '14px',
        width: '14px',
        display: 'block',
        backgroundRepeat: 'no-repeat',
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='none'%3E%3Cpath d='M10.4125 5.95L12.7225 11.725H11.5911L10.9606 10.15H8.81335L8.18387 11.725H7.05302L9.3625 5.95H10.4125ZM5.95 1.75V2.8H9.1V3.85H8.0668C7.66183 5.06909 7.01547 6.19413 6.1663 7.15803C6.54498 7.49592 6.95573 7.79607 7.3927 8.0542L6.99842 9.04015C6.43432 8.72021 5.90674 8.33979 5.425 7.90563C4.48713 8.75442 3.37647 9.3899 2.16947 9.76833L1.88807 8.7556C2.92224 8.42585 3.87521 7.88165 4.68475 7.15855C4.08556 6.48022 3.58648 5.71967 3.20267 4.9H4.37867C4.67128 5.44015 5.02215 5.94664 5.425 6.41043C6.08131 5.65395 6.59853 4.78728 6.95275 3.85053L1.75 3.85V2.8H4.9V1.75H5.95ZM9.8875 7.46463L9.23282 9.1H10.5411L9.8875 7.46463Z' fill='%237D52F4'/%3E%3C/svg%3E\")",
        backgroundPosition: 'center',
      },
    },
    // Style for the "Create:" prefix on new translation suggestions
    '.cm-new-translation-option .cm-completionLabel': {
      fontWeight: '500',
      '&::before': {
        content: "'create: '",
        color: 'hsl(var(--foreground-400))',
        marginRight: '0.33em',
      },
    },
    // Style for the icon on new translation suggestions
    '.cm-new-translation-option .cm-completionIcon': {
      '&::after': {
        content: "''",
        height: '14px',
        width: '14px',
        display: 'block',
        backgroundRepeat: 'no-repeat',
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='none'%3E%3Cpath d='M10.4125 5.95L12.7225 11.725H11.5911L10.9606 10.15H8.81335L8.18387 11.725H7.05302L9.3625 5.95H10.4125ZM5.95 1.75V2.8H9.1V3.85H8.0668C7.66183 5.06909 7.01547 6.19413 6.1663 7.15803C6.54498 7.49592 6.95573 7.79607 7.3927 8.0542L6.99842 9.04015C6.43432 8.72021 5.90674 8.33979 5.425 7.90563C4.48713 8.75442 3.37647 9.3899 2.16947 9.76833L1.88807 8.7556C2.92224 8.42585 3.87521 7.88165 4.68475 7.15855C4.08556 6.48022 3.58648 5.71967 3.20267 4.9H4.37867C4.67128 5.44015 5.02215 5.94664 5.425 6.41043C6.08131 5.65395 6.59853 4.78728 6.95275 3.85053L1.75 3.85V2.8H4.9V1.75H5.95ZM9.8875 7.46463L9.23282 9.1H10.5411L9.8875 7.46463Z' fill='%237D52F4'/%3E%3C/svg%3E\")",
        backgroundPosition: 'center',
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
  size?: 'sm' | 'md' | '2xs' | '3xs';
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
        highlightSelectionMatches: false,
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
