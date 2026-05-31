import CliTable3 from 'cli-table3';
import { Text } from 'ink';
import React from 'react';

interface MarkdownTableProps {
  header: string[];
  rows: string[][];
  width: number;
}

export function MarkdownTable({ header, rows, width }: MarkdownTableProps): React.ReactElement {
  const Table = CliTable3 as unknown as new (
    options: Record<string, unknown>
  ) => {
    push: (...rows: unknown[]) => void;
    toString: () => string;
  };

  const colCount = header.length || (rows[0]?.length ?? 1);
  const colWidth = Math.max(8, Math.floor((width - colCount - 1) / Math.max(colCount, 1)));
  const colWidths = Array.from({ length: colCount }, () => colWidth);

  const table = new Table({
    head: header,
    colWidths,
    wordWrap: true,
    style: {
      head: ['cyan'],
      border: ['gray'],
    },
  });

  for (const row of rows) {
    table.push(row);
  }

  return <Text>{table.toString()}</Text>;
}
