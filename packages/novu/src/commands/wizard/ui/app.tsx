import clipboardy from 'clipboardy';
import { Box, useApp, useWindowSize } from 'ink';
import React from 'react';
import { AgentRunHeader } from './components/agent-run-header';
import { BootScreen } from './components/boot-screen';
import { CommandFooter } from './components/command-footer';
import { Composer } from './components/composer';
import { ErrorsOverlay } from './components/errors-overlay';
import { Header } from './components/header';
import { HelpOverlay } from './components/help-overlay';
import { Intake } from './components/intake';
import { LiveTail } from './components/live-tail';
import { ToolsOverlay } from './components/tools-overlay';
import { renderTranscriptEntries } from './components/transcript';
import { TranscriptViewport, type TranscriptViewportHandle } from './components/transcript-viewport';
import { type ScrollAction, useScrollKeys } from './hooks/use-scroll-keys';
import { useWizardSession } from './state/use-wizard-session';
import type { AgentRunSummary, MountInkAppParams, ToolCall } from './types';

interface AppProps extends MountInkAppParams {
  onResolve: (result: { exitCode: number; summary: AgentRunSummary }) => void;
}

export function App(props: AppProps): React.ReactElement {
  const { exit } = useApp();
  const { columns, rows } = useWindowSize();
  const width = Math.max(40, columns);
  const height = Math.max(10, rows);

  const [showHelp, setShowHelp] = React.useState(false);
  const [showErrors, setShowErrors] = React.useState(false);
  const [showTools, setShowTools] = React.useState(false);
  const [history, setHistory] = React.useState<string[]>([]);
  const [composerBufferLen, setComposerBufferLen] = React.useState(0);
  const transcriptRef = React.useRef<TranscriptViewportHandle>(null);

  const session = useWizardSession({
    options: props.options,
    anonymousId: props.anonymousId,
    onTrack: props.onTrack,
  });

  const exitWith = React.useCallback(
    (code: number) => {
      props.onResolve({ exitCode: code, summary: session.state.summary });
      setTimeout(() => exit(), 50);
    },
    [exit, props, session.state.summary]
  );

  React.useEffect(() => {
    if (session.state.phase === 'done') {
      exitWith(session.state.errors.length > 0 ? 1 : 0);
    }
    if (session.state.phase === 'failed') {
      exitWith(1);
    }
  }, [session.state.phase, session.state.errors.length, exitWith]);

  const handleSubmit = React.useCallback(
    (text: string) => {
      setHistory((prev) => [...prev, text]);
      session.submitUser(text);
    },
    [session]
  );

  const handleSlash = React.useCallback(
    (command: string, rest: string) => {
      switch (command) {
        case '/exit':
        case '/quit':
          session.exit('session ended by /exit');

          return;
        case '/help':
          setShowHelp(true);

          return;
        case '/errors':
          setShowErrors(true);

          return;
        case '/tools':
          setShowTools(true);

          return;
        case '/clear':
          session.clear();

          return;
        case '/copy': {
          const lastAssistant = [...session.state.entries].reverse().find((entry) => entry.kind === 'assistant');
          if (!lastAssistant || lastAssistant.kind !== 'assistant') {
            session.showInfo('no assistant message to copy yet');

            return;
          }
          try {
            clipboardy.writeSync(lastAssistant.markdown);
            session.showInfo('copied last assistant message to clipboard');
          } catch (error) {
            session.showInfo(`copy failed: ${error instanceof Error ? error.message : String(error)}`);
          }

          return;
        }
        case '/diff': {
          const diffs = session.state.entries.filter((entry) => entry.kind === 'diff');
          if (diffs.length === 0) {
            session.showInfo('no diffs in this session yet');

            return;
          }
          session.showInfo(`${diffs.length} diff(s) in this session — scroll up to see them`);

          return;
        }
        case '/skills': {
          const installed = session.state.installedSkills;
          if (installed.length === 0) {
            session.showInfo('no skills installed yet');

            return;
          }
          session.showInfo(`installed ${installed.length} skill files: ${installed.map((s) => s.name).join(', ')}`);

          return;
        }
        case '/model':
          session.showInfo(
            rest
              ? `/model switching is not yet implemented — re-run wizard with --model ${rest}`
              : '/model usage: /model <id> (not yet implemented in-session)'
          );

          return;
        default:
          session.showInfo(`unknown command: ${command} — try /help`);
      }
    },
    [session]
  );

  React.useEffect(() => {
    if (!showHelp) return;
    const timer = setTimeout(() => setShowHelp(false), 8000);

    return () => clearTimeout(timer);
  }, [showHelp]);

  const scrollTranscript = React.useCallback((action: ScrollAction) => {
    transcriptRef.current?.scroll(action);
  }, []);
  useScrollKeys(scrollTranscript, { mode: 'inline', isActive: !showErrors && !showTools });

  const allToolCalls = React.useMemo<ToolCall[]>(() => {
    const calls: ToolCall[] = [];
    for (const entry of session.state.entries) {
      if (entry.kind === 'tool-batch') calls.push(...entry.calls);
    }
    if (session.state.activeToolBatch) calls.push(...session.state.activeToolBatch.calls);

    return calls;
  }, [session.state.entries, session.state.activeToolBatch]);

  const transcriptWidth = Math.max(40, width - 2);
  const showIntake = session.state.phase === 'intake' && !session.state.intent;
  const showBoot = session.state.phase === 'auth' || session.state.phase === 'booting';
  const composerVisible = session.state.phase !== 'done' && session.state.phase !== 'failed';
  const composerDisabled = session.state.phase !== 'awaiting-input';
  const composerBusy = session.state.phase === 'agent-running' || session.state.phase === 'installing-skills';
  const intakeInputActive = showIntake && composerBufferLen === 0;
  const showAgentRunHeader =
    session.state.phase === 'agent-running' ||
    session.state.phase === 'awaiting-input' ||
    session.state.phase === 'installing-skills';
  const hasNovuFramework = session.state.project?.installedNovuPackages.includes('@novu/framework') ?? false;

  const transcriptChildren: React.ReactElement[] = [];
  if (showBoot) {
    transcriptChildren.push(<BootScreen key="phase-boot" state={session.state} width={transcriptWidth} />);
  }
  for (const node of renderTranscriptEntries(session.state.entries, transcriptWidth)) {
    if (node) transcriptChildren.push(node);
  }
  transcriptChildren.push(<LiveTail key="live-tail" state={session.state} width={transcriptWidth} />);
  if (showHelp) {
    transcriptChildren.push(
      <HelpOverlay key="help-overlay" width={transcriptWidth} onDismiss={() => setShowHelp(false)} />
    );
  }

  const contentToken = `${session.state.entries.length}|${session.state.liveAssistant?.markdown.length ?? 0}|${
    session.state.activeToolBatch?.calls.length ?? 0
  }|${showHelp ? 'h' : ''}|${showBoot ? 'b' : ''}`;

  if (showErrors) {
    return (
      <Box flexDirection="column" width={width} height={height}>
        <ErrorsOverlay
          errors={session.state.errors}
          width={width}
          height={height}
          onDismiss={() => setShowErrors(false)}
        />
      </Box>
    );
  }

  if (showTools) {
    return (
      <Box flexDirection="column" width={width} height={height}>
        <ToolsOverlay calls={allToolCalls} width={width} height={height} onDismiss={() => setShowTools(false)} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Header state={session.state} width={width} />
      {showAgentRunHeader ? <AgentRunHeader state={session.state} width={width} /> : null}
      {showIntake ? (
        <Box flexDirection="column" flexGrow={1} width={width}>
          <Intake
            width={width}
            hasNovuFramework={hasNovuFramework}
            isActive={intakeInputActive}
            onComplete={(intent) => session.submitIntent(intent)}
            onCancel={() => session.exit('intake cancelled')}
          />
        </Box>
      ) : (
        <TranscriptViewport ref={transcriptRef} contentToken={contentToken}>
          {transcriptChildren}
        </TranscriptViewport>
      )}
      {composerVisible ? (
        <Composer
          disabled={composerDisabled}
          busy={composerBusy}
          width={width}
          history={history}
          state={session.state}
          errorCount={session.state.errors.length}
          passThroughNav={showIntake}
          onBufferChange={setComposerBufferLen}
          onSubmit={handleSubmit}
          onSlashCommand={handleSlash}
          onInterrupt={session.interrupt}
          onExit={() => session.exit('session ended (ctrl+c)')}
        />
      ) : null}
      {composerVisible ? (
        <CommandFooter width={width} model={session.state.options.model ?? 'claude-sonnet-4-6'} />
      ) : null}
    </Box>
  );
}
