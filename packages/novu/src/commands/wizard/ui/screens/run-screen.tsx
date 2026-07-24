import { Box, Text } from 'ink';
import React from 'react';
import { AuthPane } from '../components/auth-pane';
import { BootstrapWelcome } from '../components/bootstrap-welcome';
import { CommandFooter } from '../components/command-footer';
import { ErrorsOverlay } from '../components/errors-overlay';
import { HelpOverlay } from '../components/help-overlay';
import { LiveTail } from '../components/live-tail';
import { McpPane } from '../components/mcp-pane';
import { OutroPane } from '../components/outro-pane';
import { SkillsPane } from '../components/skills-pane';
import { useBootstrapCountdown } from '../hooks/use-bootstrap-countdown';
import { useSlashInput } from '../hooks/use-slash-input';
import { useStdoutDimensions } from '../hooks/use-stdout-dimensions';
import { useStore } from '../hooks/use-store';
import { ChatOverlay } from '../overlays/chat-overlay';
import { type ProgressItem, ProgressList, SplitView, TaskStatus } from '../primitives';
import type { WizardServices } from '../services';
import type { PipelinePhase, TodoEntry } from '../store';
import { Overlay } from '../store';
import { theme } from '../theme';
import { RunPhase, type WizardSession } from '../wizard-session';

const NARROW_COLUMNS = 80;

export function RunScreen({ services }: { services: WizardServices }): React.ReactElement {
  const phases = useStore(services.store.phases);
  const todos = useStore(services.store.todos);
  const overlay = useStore(services.store.overlay);
  const session = useStore(services.store.session);
  const [columns, rows] = useStdoutDimensions();
  const isNarrow = columns < NARROW_COLUMNS;

  useBootstrapCountdown(services);

  const isOutroPhase =
    session.runPhase === RunPhase.Outro || session.runPhase === RunPhase.Error || session.runPhase === RunPhase.Done;

  const { buffer, isComposing } = useSlashInput({
    store: services.store,
    isActive: overlay === Overlay.None,
    onSubmitEmpty: isOutroPhase
      ? () => {
          services.store.getGate('outro').resolve();
        }
      : undefined,
  });

  const pipelineItems = React.useMemo<ProgressItem[]>(() => phases.map(toProgressItem), [phases]);
  const todoItems = React.useMemo<ProgressItem[]>(() => todos.map(todoToProgressItem), [todos]);

  const model = session.options.model ?? 'claude-sonnet-4-6';
  const showTimings = !!session.options.debug;
  const rightPane = renderRightPane(session.runPhase, session, todoItems, services, showTimings);

  if (overlay !== Overlay.None) {
    /**
     * Overlays render INSIDE the ScreenContainer body, which already reserves
     * one row for `WizardHeader`. Hand the overlay the body's actual height.
     */
    return renderOverlay(overlay, services, columns, Math.max(1, rows - 1));
  }

  return (
    <Box flexDirection="column" flexGrow={1} paddingX={1} overflow="hidden">
      <Box marginTop={1} flexGrow={1} flexShrink={1} overflow="hidden">
        {isNarrow ? (
          <Box flexDirection="column" overflow="hidden">
            {rightPane}
          </Box>
        ) : (
          <SplitView
            left={<ProgressList items={pipelineItems} title="Pipeline" showTimings={showTimings} />}
            right={rightPane}
          />
        )}
      </Box>
      <Box marginTop={1} flexShrink={0} flexDirection="column">
        <LiveTail store={services.store} isActive={overlay === Overlay.None} />
      </Box>
      <Box flexShrink={0}>
        <CommandFooter width={columns} model={model} buffer={buffer} isActive={isComposing} />
      </Box>
    </Box>
  );
}

function renderOverlay(overlay: Overlay, services: WizardServices, width: number, height: number): React.ReactElement {
  if (overlay === Overlay.Chat) {
    return (
      <ChatOverlay
        store={services.store}
        width={width}
        height={height}
        onDismiss={() => services.store.closeOverlay()}
      />
    );
  }
  if (overlay === Overlay.Help) {
    return <HelpOverlay width={width} height={height} onDismiss={() => services.store.closeOverlay()} />;
  }
  if (overlay === Overlay.Errors) {
    return (
      <ErrorsOverlay
        store={services.store}
        width={width}
        height={height}
        onDismiss={() => services.store.closeOverlay()}
      />
    );
  }

  return (
    <Box>
      <Text color={theme.error}>Unknown overlay: {overlay}</Text>
    </Box>
  );
}

function renderRightPane(
  runPhase: RunPhase,
  session: WizardSession,
  todoItems: ProgressItem[],
  services: WizardServices,
  showTimings: boolean
): React.ReactElement {
  switch (runPhase) {
    case RunPhase.Idle:
    case RunPhase.Bootstrap:
      return <BootstrapWelcome session={session} />;
    case RunPhase.Auth:
      return <AuthPane session={session} />;
    case RunPhase.Skills:
      return <SkillsPane session={session} />;
    case RunPhase.Mcp:
      return <McpPane services={services} />;
    case RunPhase.Outro:
    case RunPhase.Error:
    case RunPhase.Done:
      return <OutroPane services={services} />;
    default:
      return <ProgressList items={todoItems} title="Agent tasks" showTimings={showTimings} />;
  }
}

function toProgressItem(phase: PipelinePhase): ProgressItem {
  return {
    id: phase.id,
    idleForm: phase.idleForm,
    activeForm: phase.activeForm,
    completedForm: phase.completedForm,
    status: mapPhaseStatus(phase.status),
    hint: phase.hint,
    startedAt: phase.startedAt,
    durationMs: phase.durationMs,
  };
}

function mapPhaseStatus(status: PipelinePhase['status']): TaskStatus {
  switch (status) {
    case 'done':
      return TaskStatus.Done;
    case 'running':
      return TaskStatus.Running;
    case 'error':
      return TaskStatus.Error;
    case 'cancelled':
      return TaskStatus.Cancelled;
    case 'pending':
    default:
      return TaskStatus.Pending;
  }
}

function todoToProgressItem(todo: TodoEntry): ProgressItem {
  const idleForm = todo.content;
  const activeForm = todo.activeForm ?? todo.content;

  return {
    id: todo.id,
    idleForm,
    activeForm,
    completedForm: todo.content,
    status: mapTodoStatus(todo.status),
    startedAt: todo.startedAt,
    durationMs: todo.durationMs,
  };
}

function mapTodoStatus(status: TodoEntry['status']): TaskStatus {
  switch (status) {
    case 'completed':
      return TaskStatus.Done;
    case 'in_progress':
      return TaskStatus.Running;
    case 'cancelled':
      return TaskStatus.Cancelled;
    case 'pending':
    default:
      return TaskStatus.Pending;
  }
}
