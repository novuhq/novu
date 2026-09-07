import fs from 'node:fs';
import path from 'node:path';
import { createTwoFilesPatch, structuredPatch } from 'diff';

export interface DiffSummary {
  patch: string;
  added: number;
  removed: number;
}

export function buildEditDiff(filePath: string, oldString: string, newString: string): DiffSummary {
  const display = relativePath(filePath);
  const patch = createTwoFilesPatch(display, display, oldString, newString, '', '', { context: 3 });

  return { patch, ...countAddedRemoved(oldString, newString) };
}

export function buildWriteDiff(filePath: string, content: string): DiffSummary {
  const display = relativePath(filePath);
  let previous = '';
  try {
    previous = fs.readFileSync(filePath, 'utf8');
  } catch {
    previous = '';
  }
  const patch = createTwoFilesPatch(display, display, previous, content, '', '', { context: 3 });

  return { patch, ...countAddedRemoved(previous, content) };
}

function countAddedRemoved(previous: string, next: string): { added: number; removed: number } {
  const result = structuredPatch('a', 'b', previous, next, '', '', { context: 0 });
  let added = 0;
  let removed = 0;
  for (const hunk of result.hunks) {
    for (const line of hunk.lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) added += 1;
      else if (line.startsWith('-') && !line.startsWith('---')) removed += 1;
    }
  }

  return { added, removed };
}

function relativePath(filePath: string): string {
  if (!path.isAbsolute(filePath)) return filePath;
  const cwd = process.cwd();

  return filePath.startsWith(cwd) ? path.relative(cwd, filePath) : filePath;
}
