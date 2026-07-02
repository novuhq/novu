export type ClaudeBuiltinTool = {
  /** The `type`/name string passed in the Anthropic API `tools` array */
  type: string;
  name: string;
  description: string;
};

export const CLAUDE_BUILTIN_TOOLS: ClaudeBuiltinTool[] = [
  {
    type: 'bash',
    name: 'Bash',
    description: 'Execute bash commands in a shell session.',
  },
  {
    type: 'read',
    name: 'Read',
    description: 'Read a file from the local filesystem.',
  },
  {
    type: 'write',
    name: 'Write',
    description: 'Write a file to the local filesystem.',
  },
  {
    type: 'edit',
    name: 'Edit',
    description: 'Perform string replacement in a file.',
  },
  {
    type: 'glob',
    name: 'Glob',
    description: 'Fast file pattern matching using glob patterns.',
  },
  {
    type: 'grep',
    name: 'Grep',
    description: 'Text search using regex patterns.',
  },
  {
    type: 'web_fetch',
    name: 'Web Fetch',
    description: 'Fetch content from a URL.',
  },
  {
    type: 'web_search',
    name: 'Web Search',
    description: 'Search the web for information.',
  },
];

/** Tool types that are enabled by default for new managed Claude agents. */
export const CLAUDE_DEFAULT_TOOL_TYPES: string[] = ['web_search', 'web_fetch'];
