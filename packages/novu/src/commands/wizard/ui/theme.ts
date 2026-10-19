export const theme = {
  brand: 'cyan',
  brandDim: 'cyanBright',
  accent: 'magenta',
  ok: 'green',
  warn: 'yellow',
  error: 'red',
  muted: 'gray',
  user: 'cyan',
  wizard: 'magenta',
  tool: 'gray',
  diff: 'yellow',
  link: 'blue',
  codeBg: 'gray',
  headingL1: 'cyan',
  headingL2: 'yellow',
  headingL3: 'magenta',
} as const;

export const glyphs = {
  user: '>',
  wizard: '*',
  tool: '\u25b8',
  diffAdd: '+',
  diffRemove: '-',
  ok: '\u2714',
  error: '\u2716',
  warn: '!',
  prompt: '\u276f',
  spinner: '\u2026',
  bullet: '\u2022',
  rule: '\u2500',
  expanded: '\u25be',
  collapsed: '\u25b8',
  pipe: '\u2502',
} as const;

export type ThemeColor = (typeof theme)[keyof typeof theme];
