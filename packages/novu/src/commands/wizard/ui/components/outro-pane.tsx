import figures from 'figures';
import { Box, Text } from 'ink';
import React from 'react';
import { useStore } from '../hooks/use-store';
import type { WizardServices } from '../services';
import { theme } from '../theme';
import { type OutroData, OutroKind } from '../wizard-session';

export type OutroPaneProps = {
  services: WizardServices;
};

/**
 * Right-pane content shown while the wizard is in `RunPhase.Outro` /
 * `RunPhase.Error` / `RunPhase.Done`. Used to be its own screen — folded
 * into RunScreen so the run pane chrome (header + pipeline + live tail)
 * stays put through the final summary.
 *
 * The outro gate is resolved by:
 *  - `pipeline/runner.ts` immediately when the run finished without errors
 *    (success path → auto-finish), or
 *  - the user pressing Enter (with an empty slash buffer) when there ARE
 *    errors — wired through `useSlashInput`'s `onSubmitEmpty` in
 *    `run-screen.tsx`. That keeps `/errors` and other slash commands fully
 *    typeable on the outro screen instead of any keypress dismissing it.
 */
export function OutroPane({ services }: OutroPaneProps): React.ReactElement {
  const session = useStore(services.store.session);
  const data = session.outroData;

  if (!data) {
    return (
      <Box flexDirection="column" gap={1}>
        <Text dimColor>{figures.ellipsis} Wrapping up…</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1}>
      <OutroHeader data={data} />
      <OutroChanges changes={data.changes ?? []} />
      <OutroLinks data={data} />
      <OutroFooter data={data} />
    </Box>
  );
}

function OutroHeader({ data }: { data: OutroData }): React.ReactElement {
  if (data.kind === OutroKind.Success) {
    return (
      <Text bold color={theme.ok}>
        {figures.tick} {data.message}
      </Text>
    );
  }
  if (data.kind === OutroKind.Error) {
    return (
      <Text bold color={theme.error}>
        {figures.cross} {data.message}
      </Text>
    );
  }

  return (
    <Text bold color={theme.warn}>
      {figures.warning} {data.message}
    </Text>
  );
}

function OutroChanges({ changes }: { changes: string[] }): React.ReactElement | null {
  if (changes.length === 0) return null;

  return (
    <Box flexDirection="column">
      <Text bold dimColor>
        What was done:
      </Text>
      {changes.slice(0, 6).map((change) => (
        <Text key={change}>
          <Text color={theme.ok}>{figures.tick}</Text> {change}
        </Text>
      ))}
    </Box>
  );
}

function OutroFooter({ data }: { data: OutroData }): React.ReactElement {
  if (data.kind === OutroKind.Error) {
    return (
      <Text dimColor>
        Type <Text color={theme.brand}>/errors</Text> to inspect issues · press <Text color={theme.brand}>Enter</Text>{' '}
        to exit
      </Text>
    );
  }

  return (
    <Text dimColor>
      Exiting… press <Text color={theme.brand}>Enter</Text> to exit now
    </Text>
  );
}

function OutroLinks({ data }: { data: OutroData }): React.ReactElement | null {
  const hasAny = Boolean(data.reportFile || data.dashboardUrl || data.docsUrl);
  if (!hasAny) return null;

  return (
    <Box flexDirection="column">
      {data.reportFile ? (
        <Text>
          <Text dimColor>Report: </Text>
          {data.reportFile}
        </Text>
      ) : null}
      {data.dashboardUrl ? (
        <Text>
          <Text dimColor>Dashboard: </Text>
          <Text color={theme.link} underline>
            {data.dashboardUrl}
          </Text>
        </Text>
      ) : null}
      {data.docsUrl ? (
        <Text>
          <Text dimColor>Docs: </Text>
          <Text color={theme.link} underline>
            {data.docsUrl}
          </Text>
        </Text>
      ) : null}
    </Box>
  );
}
