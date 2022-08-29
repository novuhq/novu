import { useEffect, useRef, useState } from 'react';
import { IEmailBlock } from '@novu/shared';
import { useFormContext } from 'react-hook-form';
import { createStyles, useMantineTheme } from '@mantine/core';
import { Content } from './Content';

export function ContentContainer({
  contentPlaceholder,
  readonly,
  value,
  onChange,
  index,
}: {
  contentPlaceholder: string;
  readonly: boolean;
  onChange: (data: any) => void;
  value: string;
  index: number;
}) {
  const theme = useMantineTheme();
  const ref = useRef<HTMLDivElement>(null);
  const showPlaceHolder = value.length === 0;
  const [content, setContent] = useState<string | IEmailBlock[]>(value);
  const { classes } = useStyles();

  const {
    formState: { errors },
  } = useFormContext();

  useEffect(() => {
    if (ref.current && value !== ref.current?.innerHTML) {
      setContent(value);
    }
  }, [value]);

  return (
    <Content
      content={content}
      contentPlaceholder={contentPlaceholder}
      readonly={readonly}
      index={index}
      ref={ref}
      onChange={onChange}
      theme={theme}
      showPlaceHolder={showPlaceHolder}
      classes={classes}
      errors={errors}
    />
  );
}

export const useStyles = createStyles((theme, _params, getRef) => {
  return {
    wrapper: {
      position: 'absolute',
      width: '100%',
      height: '29px',
      zIndex: 1,
      top: 0,
      pointerEvents: 'none',
      opacity: '0.4',
    },

    input: {
      border: 'none',
      padding: '0',
      fontWeight: '700',
    },

    error: {
      margin: '0',
    },
  } as any;
});
