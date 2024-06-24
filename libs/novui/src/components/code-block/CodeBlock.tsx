import { CodeProps as ExternalCodeProps, Code as ExternalCode } from '@mantine/core';

export type CodeBlockProps = ExternalCodeProps;

export const CodeBlock = (props: CodeBlockProps) => {
  return <ExternalCode {...props} />;
};
