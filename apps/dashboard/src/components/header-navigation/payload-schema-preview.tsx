import { TriangleAlert } from 'lucide-react';
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { RiTerminalFill } from 'react-icons/ri';
import { cn } from '@/utils/ui';
import type { PayloadSchemaPreview as PayloadSchemaPreviewModel } from './change-sections';
import {
  type DiffBlock,
  type DiffLine,
  type DiffRow,
  type JsonLineDiff,
  schemaFocusLineNumbers,
} from './json-line-diff';

export type EnvironmentNames = {
  source: string;
  target: string;
};

type DiffSide = 'left' | 'right';

const JSON_KEY_LINE = /^(\s*)("(?:[^"\\]|\\.)*")(:\s*)(.*)$/;
const PUNCTUATION_ONLY = /^[[\]{}]*$/;

type SchemaFocus = {
  left: Set<number>;
  right: Set<number>;
  /** The line the pane scrolls to, on one side. */
  anchor: { side: DiffSide; lineNumber: number } | null;
};

const EMPTY_FOCUS: SchemaFocus = { left: new Set(), right: new Set(), anchor: null };

export function PayloadSchemaPreview({
  preview,
  environmentNames,
  focusPath,
  scrollNonce,
  scrollPaneRef,
}: {
  preview: PayloadSchemaPreviewModel;
  environmentNames: EnvironmentNames;
  /** Payload variable path selected in the sidebar, e.g. `resetUrl`. */
  focusPath: string | null;
  scrollNonce: number;
  scrollPaneRef: RefObject<HTMLDivElement | null>;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const diffRef = useRef<HTMLDivElement>(null);
  const [expandedGaps, setExpandedGaps] = useState<Set<string>>(() => new Set());
  const { lineDiff, note, hasPrevious, validation } = preview;
  const hasLineChanges = lineDiff.added + lineDiff.removed > 0;
  const focus = useMemo(() => (focusPath ? schemaFocus(lineDiff, focusPath) : EMPTY_FOCUS), [focusPath, lineDiff]);

  const expandGap = (id: string) => setExpandedGaps((current) => new Set(current).add(id));

  useEffect(() => {
    // `scrollNonce` bumps on every sidebar click, so clicking the same variable scrolls to it again.
    if (!focusPath || scrollNonce === 0) {
      return;
    }

    const hiddenGapIds = lineDiff.blocks.flatMap((block) =>
      block.kind === 'gap' && gapHidesFocus(block.rows, focus) ? [block.id] : []
    );
    const closed = hiddenGapIds.filter((id) => !expandedGaps.has(id));
    if (closed.length > 0) {
      setExpandedGaps((current) => new Set([...current, ...closed]));

      return;
    }

    const anchor = rootRef.current?.querySelector('[data-schema-focus="scroll"]');
    const paneTarget = anchor ?? rootRef.current;
    if (anchor instanceof HTMLElement && diffRef.current) {
      scrollChildToCenter(diffRef.current, anchor, 'auto');
    }
    if (paneTarget instanceof HTMLElement && scrollPaneRef.current) {
      scrollChildToCenter(scrollPaneRef.current, paneTarget, 'smooth');
    }
  }, [focusPath, scrollNonce, expandedGaps, lineDiff, focus, scrollPaneRef]);

  return (
    <div
      ref={rootRef}
      className="mt-1 flex min-w-0 flex-col gap-2.5 rounded-lg border border-stroke-soft bg-bg-white p-3"
    >
      {note && (
        <div className="flex items-center gap-2 rounded-md bg-bg-muted px-2.5 py-[7px]">
          <span className="flex size-4 shrink-0 items-center justify-center">
            <TriangleAlert className="size-3.5 text-warning-base" />
          </span>
          <p className="text-label-xs text-text-sub">{note}</p>
        </div>
      )}

      {validation && (
        <div className="flex min-w-0 gap-1.5">
          <ValidationValue name={environmentNames.target} enabled={validation.previous} />
          <ValidationValue name={environmentNames.source} enabled={validation.next} />
        </div>
      )}

      {hasLineChanges && (
        <div className="flex min-w-0 flex-col gap-1 rounded-lg border border-stroke-weak bg-bg-weak p-1.5">
          <div className="flex gap-1.5">
            <EnvironmentHeader name={environmentNames.target} tone="feature" />
            <EnvironmentHeader name={environmentNames.source} tone="warning" />
          </div>
          <div
            ref={diffRef}
            className="flex max-h-[240px] min-w-0 items-start gap-1.5 overflow-x-hidden overflow-y-auto"
          >
            <DiffColumn
              side="left"
              blocks={lineDiff.blocks}
              expandedGaps={expandedGaps}
              onExpandGap={expandGap}
              focusLines={focus.left}
              anchorLine={focus.anchor?.side === 'left' ? focus.anchor.lineNumber : null}
              emptyLabel={hasPrevious ? undefined : `No payload schema in ${environmentNames.target}`}
            />
            <DiffColumn
              side="right"
              blocks={lineDiff.blocks}
              expandedGaps={expandedGaps}
              onExpandGap={expandGap}
              focusLines={focus.right}
              anchorLine={focus.anchor?.side === 'right' ? focus.anchor.lineNumber : null}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ValidationValue({ name, enabled }: { name: string; enabled: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md bg-bg-muted px-2.5 py-1.5">
      <span className="truncate text-label-xs text-text-soft">{name}</span>
      <span className="shrink-0 text-label-xs text-text-strong">{enabled ? 'Validation on' : 'Validation off'}</span>
    </div>
  );
}

export function EnvironmentHeader({ name, tone }: { name: string; tone: 'feature' | 'warning' }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1 p-0.5">
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-md border',
          tone === 'feature'
            ? 'border-feature-lighter bg-feature-lighter text-feature-base'
            : 'border-warning-lighter bg-warning-lighter text-warning-base'
        )}
      >
        <RiTerminalFill className="size-4" />
      </span>
      <span className="truncate text-label-xs text-text-strong">{name}</span>
    </div>
  );
}

/** Side-by-side target (left) vs. source (right) JSON line diff with collapsible unchanged runs. */
export function JsonDiffCompare({
  lineDiff,
  hasPrevious,
  hasNext,
  environmentNames,
}: {
  lineDiff: JsonLineDiff;
  hasPrevious: boolean;
  hasNext: boolean;
  environmentNames: EnvironmentNames;
}) {
  const [expandedGaps, setExpandedGaps] = useState<Set<string>>(() => new Set());
  const expandGap = (id: string) => setExpandedGaps((current) => new Set(current).add(id));

  return (
    <div className="flex max-h-[400px] min-w-0 items-start gap-1.5 overflow-x-hidden overflow-y-auto">
      <DiffColumn
        side="left"
        blocks={lineDiff.blocks}
        expandedGaps={expandedGaps}
        onExpandGap={expandGap}
        emptyLabel={hasPrevious ? undefined : `Not in ${environmentNames.target}`}
      />
      <DiffColumn
        side="right"
        blocks={lineDiff.blocks}
        expandedGaps={expandedGaps}
        onExpandGap={expandGap}
        emptyLabel={hasNext ? undefined : `Not in ${environmentNames.source}`}
      />
    </div>
  );
}

const NO_FOCUS_LINES = new Set<number>();

export function DiffColumn({
  side,
  blocks,
  expandedGaps,
  onExpandGap,
  focusLines = NO_FOCUS_LINES,
  anchorLine = null,
  emptyLabel,
}: {
  side: DiffSide;
  blocks: DiffBlock[];
  expandedGaps: Set<string>;
  onExpandGap: (id: string) => void;
  focusLines?: Set<number>;
  anchorLine?: number | null;
  emptyLabel?: string;
}) {
  if (emptyLabel) {
    return (
      <div className="flex min-h-24 min-w-0 flex-1 items-center justify-center self-stretch rounded-md border border-stroke-soft bg-bg-white p-3">
        <span className="text-center text-paragraph-xs text-text-soft">{emptyLabel}</span>
      </div>
    );
  }

  return (
    <div className="min-w-0 flex-1 overflow-x-auto rounded-md border border-stroke-soft bg-bg-white">
      <div className="w-max min-w-full">
        {blocks.map((block) => {
          if (block.kind === 'gap' && !expandedGaps.has(block.id)) {
            return <GapRow key={block.id} count={block.rows.length} onExpand={() => onExpandGap(block.id)} />;
          }

          return block.rows.map((row, index) => {
            const line = sideLine(row, side);

            return (
              <DiffCell
                key={`${block.id}-${index}`}
                line={line}
                side={side}
                focused={line !== null && focusLines.has(line.lineNumber)}
                anchor={line !== null && line.lineNumber === anchorLine}
              />
            );
          });
        })}
      </div>
    </div>
  );
}

function sideLine(row: DiffRow, side: DiffSide): DiffLine | null {
  return side === 'left' ? row.left : row.right;
}

function lineBackground(line: DiffLine | null): string {
  if (!line) return 'bg-bg-weak';

  switch (line.type) {
    case 'removed':
      return 'bg-error-base/15';
    case 'added':
      return 'bg-success-base/15';
    case 'unchanged':
      return '';
    default: {
      const _exhaustiveCheck: never = line.type;

      return _exhaustiveCheck;
    }
  }
}

function DiffCell({
  line,
  side,
  focused,
  anchor,
}: {
  line: DiffLine | null;
  side: DiffSide;
  focused: boolean;
  anchor: boolean;
}) {
  const changed = line !== null && line.type !== 'unchanged';
  const marker = side === 'left' ? '-' : '+';

  return (
    <div
      data-schema-focus={anchor ? 'scroll' : undefined}
      className={cn(
        'flex h-6 font-code text-xs',
        lineBackground(line),
        (focused || anchor) && 'ring-1 ring-inset ring-feature-base'
      )}
    >
      <span
        className={cn(
          'flex w-[30px] shrink-0 items-center justify-center tracking-[-0.24px]',
          changed ? 'text-text-sub' : 'text-text-soft'
        )}
      >
        {line?.lineNumber}
      </span>
      <span className="relative min-w-0 flex-1 pl-[39px] pr-3 leading-6">
        {changed && <span className="absolute left-2 text-text-sub">{marker}</span>}
        {line && <JsonLineText text={line.text} />}
      </span>
    </div>
  );
}

function GapRow({ count, onExpand }: { count: number; onExpand: () => void }) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className="flex h-6 w-full bg-bg-weak font-code text-xs text-text-sub hover:text-text-strong"
    >
      <span className="w-[30px] shrink-0" />
      <span className="whitespace-pre pl-[39px] pr-3 leading-6">{`⋯  ${count} unchanged lines`}</span>
    </button>
  );
}

function JsonValueText({ value, isPropertyValue }: { value: string; isPropertyValue: boolean }) {
  const hasComma = value.endsWith(',');
  const body = hasComma ? value.slice(0, -1) : value;
  const isPunctuation = !isPropertyValue && PUNCTUATION_ONLY.test(body.trim());

  return (
    <>
      <span className={isPunctuation ? 'text-text-sub' : 'text-text-strong'}>{body}</span>
      {hasComma && <span className="text-text-sub">,</span>}
    </>
  );
}

function scrollChildToCenter(container: HTMLElement, child: HTMLElement, behavior: ScrollBehavior) {
  const top =
    container.scrollTop +
    child.getBoundingClientRect().top -
    container.getBoundingClientRect().top -
    container.clientHeight / 2 +
    child.clientHeight / 2;

  container.scrollTo({ top: Math.max(0, top), behavior });
}

function linesOf(diff: JsonLineDiff, side: DiffSide): string[] {
  const lines: string[] = [];

  for (const block of diff.blocks) {
    for (const row of block.rows) {
      const line = sideLine(row, side);
      if (line) lines[line.lineNumber - 1] = line.text;
    }
  }

  return lines;
}

function sideLines(blocks: DiffBlock[], side: DiffSide): DiffLine[] {
  const lines: DiffLine[] = [];

  for (const block of blocks) {
    for (const row of block.rows) {
      const line = sideLine(row, side);
      if (line) lines.push(line);
    }
  }

  return lines;
}

function lineIndent(text: string): number {
  return text.match(/^\s*/)?.[0].length ?? 0;
}

/** The declaration line when it changed, otherwise the first changed line inside its schema block. */
function changedLineForDeclaration(lines: DiffLine[], declarationLine: number): number | null {
  const start = lines.findIndex((line) => line.lineNumber === declarationLine);
  if (start < 0) return null;
  if (lines[start].type !== 'unchanged') return lines[start].lineNumber;

  const indent = lineIndent(lines[start].text);
  for (let index = start + 1; index < lines.length; index++) {
    if (lineIndent(lines[index].text) <= indent) break;
    if (lines[index].type !== 'unchanged') return lines[index].lineNumber;
  }

  return null;
}

function anchorForSide(lines: DiffLine[], declarations: Set<number>, side: DiffSide): SchemaFocus['anchor'] {
  for (const declaration of declarations) {
    const lineNumber = changedLineForDeclaration(lines, declaration);
    if (lineNumber !== null) return { side, lineNumber };
  }

  const first = declarations.values().next().value;
  if (first === undefined) return null;

  return { side, lineNumber: first };
}

function schemaFocus(diff: JsonLineDiff, variablePath: string): SchemaFocus {
  const left = new Set(schemaFocusLineNumbers(linesOf(diff, 'left'), variablePath));
  const right = new Set(schemaFocusLineNumbers(linesOf(diff, 'right'), variablePath));
  const anchor =
    anchorForSide(sideLines(diff.blocks, 'right'), right, 'right') ??
    anchorForSide(sideLines(diff.blocks, 'left'), left, 'left');

  return { left, right, anchor };
}

function gapHidesFocus(rows: DiffRow[], focus: SchemaFocus): boolean {
  return rows.some((row) => {
    const leftHit = row.left !== null && focus.left.has(row.left.lineNumber);
    const rightHit = row.right !== null && focus.right.has(row.right.lineNumber);

    return leftHit || rightHit;
  });
}

function JsonLineText({ text }: { text: string }) {
  const match = JSON_KEY_LINE.exec(text);

  if (!match) {
    return (
      <span className="whitespace-pre">
        <JsonValueText value={text} isPropertyValue={false} />
      </span>
    );
  }

  const [, indent, key, separator, value] = match;

  return (
    <span className="whitespace-pre">
      <span>{indent}</span>
      <span className="text-feature-base">{key}</span>
      <span className="text-text-sub">{separator}</span>
      <JsonValueText value={value} isPropertyValue />
    </span>
  );
}
