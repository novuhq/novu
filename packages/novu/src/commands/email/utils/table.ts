type TableColumn<T> = {
  header: string;
  getValue: (item: T) => string;
};

function stripAnsi(str: string): string {
  return str.replace(/\u001b\[\d+m/g, '');
}

export function renderTable<T>(items: T[], columns: TableColumn<T>[], indent = ''): void {
  if (items.length === 0) {
    return;
  }

  const widths = columns.map(
    (col) => Math.max(col.header.length, ...items.map((item) => stripAnsi(col.getValue(item)).length)) + 2
  );

  const topBorder = '┌' + widths.map((w) => '─'.repeat(w)).join('┬') + '┐';
  const middleBorder = '├' + widths.map((w) => '─'.repeat(w)).join('┼') + '┤';
  const bottomBorder = '└' + widths.map((w) => '─'.repeat(w)).join('┴') + '┘';

  console.log(indent + topBorder);

  const headerRow = '│ ' + columns.map((col, i) => col.header.padEnd(widths[i] - 1)).join('│ ') + '│';
  console.log(indent + headerRow);

  console.log(indent + middleBorder);

  for (const item of items) {
    const dataRow =
      '│ ' +
      columns
        .map((col, i) => {
          const value = col.getValue(item);
          const strippedValue = stripAnsi(value);
          const padding = widths[i] - 1 - strippedValue.length;
          return value + ' '.repeat(Math.max(0, padding));
        })
        .join('│ ') +
      '│';
    console.log(indent + dataRow);
  }

  console.log(indent + bottomBorder);
}
