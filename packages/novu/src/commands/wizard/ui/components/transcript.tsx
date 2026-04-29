import React from 'react';
import type { TranscriptEntry } from '../types';
import { AssistantMarkdown } from './assistant-markdown';
import { DiffPreview } from './diff-preview';
import { StatusFooter } from './status-footer';
import { ToolBatch } from './tool-batch';
import { UserMessage } from './user-message';

interface TranscriptEntryViewProps {
  entry: TranscriptEntry;
  width: number;
}

export function TranscriptEntryView({ entry, width }: TranscriptEntryViewProps): React.ReactElement | null {
  switch (entry.kind) {
    case 'user':
      return <UserMessage text={entry.text} width={width} />;
    case 'assistant':
      return <AssistantMarkdown markdown={entry.markdown} width={width} />;
    case 'tool-batch':
      return <ToolBatch calls={entry.calls} durationMs={entry.durationMs} collapsed={entry.collapsed} />;
    case 'diff':
      return (
        <DiffPreview
          file={entry.file}
          patch={entry.patch}
          added={entry.added}
          removed={entry.removed}
          collapsed={entry.collapsed}
          width={width}
        />
      );
    case 'status':
      return <StatusFooter tone={entry.tone} message={entry.message} />;
    case 'system':
      return <StatusFooter tone="info" message={entry.text} />;
    default:
      return null;
  }
}

export function renderTranscriptEntries(entries: TranscriptEntry[], width: number): React.ReactElement[] {
  return entries.map((entry) => <TranscriptEntryView key={entry.id} entry={entry} width={width} />);
}
