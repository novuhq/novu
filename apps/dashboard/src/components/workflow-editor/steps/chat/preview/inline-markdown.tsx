import { Fragment, type ReactNode } from 'react';

/**
 * Card text carries the small markdown subset the DSL supports (bold, italic, code, links).
 * We render it with a tiny local formatter instead of pulling in a markdown library, keeping the
 * preview dependency-free and matching what the block editor lets authors write.
 */

type InlineRule = {
  regex: RegExp;
  render: (inner: ReactNode, key: string) => ReactNode;
};

// Order matters: code first (its content is literal), then bold before italic so `**x**`
// is not mis-parsed as two italics.
const INLINE_RULES: InlineRule[] = [
  {
    regex: /`([^`]+)`/,
    render: (inner, key) => (
      <code
        key={key}
        className="leading-4.5 rounded-[3px] border border-[rgba(29,28,29,0.13)] bg-[rgba(29,28,29,0.04)] px-0.75 pb-px pt-0.5 text-xs font-bold text-[#c01343]"
        style={{ fontFamily: '"Roboto Mono", "Slack-Roboto-Mono", Monaco, Menlo, Consolas, monospace' }}
      >
        {inner}
      </code>
    ),
  },
  {
    regex: /\*\*([^*]+)\*\*/,
    render: (inner, key) => (
      <strong key={key} className="font-bold">
        {inner}
      </strong>
    ),
  },
  {
    regex: /__([^_]+)__/,
    render: (inner, key) => (
      <strong key={key} className="font-bold">
        {inner}
      </strong>
    ),
  },
  { regex: /~~([^~]+)~~/, render: (inner, key) => <s key={key}>{inner}</s> },
  { regex: /\*([^*]+)\*/, render: (inner, key) => <em key={key}>{inner}</em> },
  { regex: /_([^_]+)_/, render: (inner, key) => <em key={key}>{inner}</em> },
];

const LINK_REGEX = /\[([^\]]+)\]\(([^)\s]+)\)/;

function applyEmphasis(text: string, ruleIndex: number, keyPrefix: string): ReactNode[] {
  if (ruleIndex >= INLINE_RULES.length) {
    return text ? [text] : [];
  }

  const rule = INLINE_RULES[ruleIndex];
  const match = rule.regex.exec(text);

  if (!match) {
    return applyEmphasis(text, ruleIndex + 1, keyPrefix);
  }

  const before = text.slice(0, match.index);
  const after = text.slice(match.index + match[0].length);
  const key = `${keyPrefix}-${ruleIndex}-${match.index}`;

  return [
    ...applyEmphasis(before, ruleIndex + 1, `${key}-b`),
    rule.render(applyEmphasis(match[1], ruleIndex, `${key}-i`), key),
    ...applyEmphasis(after, ruleIndex, `${key}-a`),
  ];
}

export function renderInlineMarkdown(text: string, keyPrefix = 'md'): ReactNode {
  const nodes: ReactNode[] = [];
  let remaining = text;
  let cursor = 0;

  // Extract links first so emphasis is applied inside the label and around the rest.
  let linkMatch = LINK_REGEX.exec(remaining);
  while (linkMatch) {
    const before = remaining.slice(0, linkMatch.index);
    if (before) {
      nodes.push(
        <Fragment key={`${keyPrefix}-t-${cursor}`}>{applyEmphasis(before, 0, `${keyPrefix}-t-${cursor}`)}</Fragment>
      );
    }

    const [full, label, url] = linkMatch;
    nodes.push(
      <span
        key={`${keyPrefix}-l-${cursor}`}
        aria-disabled="true"
        data-preview-url={url}
        className="cursor-default font-bold text-[#1264a3] no-underline"
      >
        {applyEmphasis(label, 0, `${keyPrefix}-l-${cursor}`)}
      </span>
    );

    remaining = remaining.slice(linkMatch.index + full.length);
    cursor += 1;
    linkMatch = LINK_REGEX.exec(remaining);
  }

  if (remaining) {
    nodes.push(
      <Fragment key={`${keyPrefix}-t-${cursor}`}>{applyEmphasis(remaining, 0, `${keyPrefix}-t-${cursor}`)}</Fragment>
    );
  }

  return nodes;
}
