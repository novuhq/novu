import type { MockShellState, RunResult, ToolCallRecord } from './types.js';

export class RunRecorder {
  private toolCalls: ToolCallRecord[] = [];
  private assistantMessages: string[] = [];
  private finalText = '';
  private capturedUrls: string[] = [];
  private openedFiles: string[] = [];
  private killedShellIds: string[] = [];
  private trackedShellIds: string[] = [];
  private polledShellIds: string[] = [];
  private trackedCommands: string[] = [];
  private metadata: Record<string, unknown> = {};

  constructor(
    private readonly scenarioId: string,
    private readonly userPrompt: string
  ) {}

  recordToolCall(name: string, args: Record<string, unknown>, result?: unknown): void {
    this.toolCalls.push({ name, args, result, timestamp: Date.now() });
  }

  recordAssistantMessage(text: string): void {
    if (text.trim()) {
      this.assistantMessages.push(text);
      this.finalText = text;
    }
  }

  recordTrackedCommand(command: string): void {
    this.trackedCommands.push(command);
  }

  setMetadata(key: string, value: unknown): void {
    this.metadata[key] = value;
  }

  recordUrl(url: string): void {
    if (!this.capturedUrls.includes(url)) {
      this.capturedUrls.push(url);
    }
  }

  recordOpenedFile(filePath: string): void {
    this.openedFiles.push(filePath);
  }

  recordTrackedShell(shellId: string): void {
    this.trackedShellIds.push(shellId);
  }

  recordPoll(shellId: string): void {
    if (!this.polledShellIds.includes(shellId)) {
      this.polledShellIds.push(shellId);
    }
  }

  recordKill(shellId: string): void {
    this.killedShellIds.push(shellId);
  }

  build(): RunResult {
    return {
      scenarioId: this.scenarioId,
      userPrompt: this.userPrompt,
      toolCalls: [...this.toolCalls],
      assistantMessages: [...this.assistantMessages],
      finalText: this.finalText,
      capturedUrls: [...this.capturedUrls],
      openedFiles: [...this.openedFiles],
      killedShellIds: [...this.killedShellIds],
      trackedShellIds: [...this.trackedShellIds],
      polledShellIds: [...this.polledShellIds],
      trackedCommands: [...this.trackedCommands],
      metadata: { ...this.metadata },
    };
  }
}

export function extractUrls(text: string): string[] {
  const matches = text.match(/(?:https?:\/\/|mailto:)[^\s)>\]"']+/g) ?? [];

  return matches.map((url) => url.replace(/[.,;]+$/, ''));
}

export function isKillCommand(command: string): boolean {
  return /\b(kill|pkill|killall)\b/.test(command);
}

export function isOpenCommand(command: string): boolean {
  return /^\s*(open|xdg-open|start)\b/.test(command.trim());
}

export function isForbiddenWatcherCommand(command: string): boolean {
  const normalized = command.toLowerCase();

  return (
    /\bsleep\b/.test(normalized) ||
    /\btail\b/.test(normalized) ||
    /\bgrep\b/.test(normalized) ||
    /\bps\b/.test(normalized) ||
    /\bschedulewakeup\b/.test(normalized)
  );
}

export function shellSummary<T>(shell: MockShellState<T>): string {
  if (shell.killed) {
    return `Shell ${shell.id} was killed.`;
  }

  return shell.emittedStdout.join('\n');
}
