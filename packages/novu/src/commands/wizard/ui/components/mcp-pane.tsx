import figures from 'figures';
import { Box, Text } from 'ink';
import React from 'react';
import { useStore } from '../hooks/use-store';
import { LoadingBox, PickerMenu, type PickerOption } from '../primitives';
import type { WizardServices } from '../services';
import { theme } from '../theme';
import type { McpClientCandidate } from '../wizard-session';

const SKIP_VALUE = '__skip__';

export type McpPaneProps = {
  services: WizardServices;
};

/**
 * Right-pane content shown while the wizard is in `RunPhase.Mcp`. Used to be
 * its own screen — folded into RunScreen so the run phase pipeline keeps the
 * familiar header / pipeline / live-tail chrome and only the right pane swaps
 * between the agent task list and this picker.
 */
export function McpPane({ services }: McpPaneProps): React.ReactElement {
  const session = useStore(services.store.session);
  const [installing, setInstalling] = React.useState(false);
  const { candidates, installed, skipped, selectedClientId } = session.mcp;

  const options = React.useMemo<PickerOption<string>[]>(() => buildOptions(candidates), [candidates]);

  if (installed.length > 0) {
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold color={theme.ok}>
          {figures.tick} Installed Novu MCP into{' '}
          {installed.length === 1 ? installed[0].clientLabel : `${installed.length} editors`}
        </Text>
        {installed.map((entry) => (
          <Text key={entry.clientId} dimColor>
            {entry.clientLabel} → {entry.configPath}
          </Text>
        ))}
      </Box>
    );
  }

  if (skipped) {
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold color={theme.warn}>
          {figures.warning} MCP install skipped
        </Text>
      </Box>
    );
  }

  if (installing) {
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold color={theme.brand}>
          Installing Novu MCP
        </Text>
        <LoadingBox message={`Installing into ${selectedClientId ?? 'editor'}…`} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color={theme.brand}>
        Install Novu MCP server
      </Text>
      <Text dimColor>
        Pick the editor / agent you want Novu MCP installed into. The MCP server lets that client author Novu workflows
        directly.
      </Text>
      <Box marginTop={1}>
        <PickerMenu
          options={options}
          onSelect={(value) => {
            if (value === SKIP_VALUE) {
              services.store.setMcpSelection(null);
              services.store.getGate('mcp').resolve();

              return;
            }
            setInstalling(true);
            services.store.setMcpSelection(value);
            services.store.getGate('mcp').resolve();
          }}
        />
      </Box>
    </Box>
  );
}

function buildOptions(candidates: McpClientCandidate[]): PickerOption<string>[] {
  const detected = candidates.filter((candidate) => candidate.detected);
  const fallback = detected.length === 0 ? candidates : detected;
  const rows: PickerOption<string>[] = fallback.map((candidate) => ({
    value: candidate.id,
    label: candidate.label,
    hint: candidate.detected ? '(detected)' : '(not detected)',
  }));
  rows.push({ value: SKIP_VALUE, label: 'Skip MCP install', hint: 'configure later' });

  return rows;
}
