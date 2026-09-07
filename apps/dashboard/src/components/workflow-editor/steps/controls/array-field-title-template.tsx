import { ArrayFieldTitleProps } from '@rjsf/utils';

export const ArrayFieldTitleTemplate = (props: ArrayFieldTitleProps) => {
  return <legend className="text-foreground-400 px-1 text-xs">{props.title}</legend>;
};
