import { Children, type CSSProperties, Fragment, type ReactNode } from 'react';
import type { HomeCommand } from '@/data/home';

import { cn } from '@/lib/utils';

// Figma rounds each auto-sized text node up and excludes trailing tracking.
// Keep the result in em so the authored word layout scales with the font.
export function textWidth(text: string, fontSize = 16) {
  return `${Math.ceil(text.length * fontSize * 0.58 + fontSize * 0.02) / fontSize}em`;
}

function ProseWord({ text }: { text: string }) {
  return (
    <span className="home-prose-word" style={{ '--home-word-width': textWidth(text) } as CSSProperties}>
      {text}
    </span>
  );
}

/** Prose with CLI flags in it, each flag (`--name`) kept on one line instead of breaking at its hyphens. */
export function FlagText({ text }: { text: string }) {
  return text.split(/(--[a-z][\w-]*)/).map((part, index) =>
    // The split keeps each flag at an odd index.
    index % 2 === 1 ? (
      <span key={index} className="whitespace-nowrap">
        {part}
      </span>
    ) : (
      part
    )
  );
}

export function AsciiRule() {
  return (
    <div aria-hidden="true" className="home-ascii-rule">
      {'='.repeat(80)}
    </div>
  );
}

export function DocSection({
  anchor,
  title,
  subtitle,
  children,
}: {
  /** The section's id, so a link can end in `#quickstart`. */
  anchor: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section id={anchor} className="home-section" aria-labelledby={`${anchor}-title`}>
      <h2 id={`${anchor}-title`} className="home-section-title">
        <span style={{ minWidth: textWidth(`* ${title}`, 18) }}>
          <span aria-hidden="true">* </span>
          {title}
        </span>
        {subtitle ? <span className="home-comment">({subtitle})</span> : null}
      </h2>
      {children}
    </section>
  );
}

export function CommandLines({ commands, fenced = false }: { commands: readonly HomeCommand[]; fenced?: boolean }) {
  return (
    <div className="home-command-list">
      {fenced ? <span aria-hidden="true">{'```'}</span> : null}
      {commands.map((command) => (
        <div key={command.parts.map((part) => part.text).join('')} className="home-command-line">
          <code>
            {command.parts.map((part, index) => (
              <span key={index} data-color={part.color}>
                {part.text}
              </span>
            ))}
          </code>
          {command.note ? (
            <span
              className="home-comment"
              style={{
                minWidth: `${Math.ceil(command.note.length * 9.28) / 16}em`,
              }}
            >
              {command.note}
            </span>
          ) : null}
        </div>
      ))}
      {fenced ? <span aria-hidden="true">{'```'}</span> : null}
    </div>
  );
}

export function InlineCode({
  children,
  compact = false,
  tall = false,
}: {
  children: ReactNode;
  compact?: boolean;
  tall?: boolean;
}) {
  const text = Children.toArray(children).join('');
  const words = compact ? text.split(/\s+/) : [text];
  return (
    <code className={cn('home-inline-code', tall && 'home-inline-code-tall')}>
      {words.map((word, index) => (
        <Fragment key={index}>
          {index > 0 ? ' ' : null}
          <ProseWord text={word} />
        </Fragment>
      ))}
    </code>
  );
}
