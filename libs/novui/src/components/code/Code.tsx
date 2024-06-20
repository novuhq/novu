import { CodeProps as ExternalCodeProps, Code as ExternalCode } from '@mantine/core';

export interface CodeProps extends ExternalCodeProps {}

export const Code = (props: CodeProps) => {
  return <ExternalCode {...props} />;
};
