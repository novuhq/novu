import figures from 'figures';
import { Box, Text } from 'ink';
import React from 'react';
import type { InstallTarget } from '../../context/detect-install-targets';
import { summariseTopology } from '../../context/summarise-topology';
import { theme } from '../theme';
import type { WizardSession } from '../wizard-session';

export type BootstrapWelcomeProps = {
  session: WizardSession;
};

/**
 * Right-pane content shown while the wizard is still in the bootstrap phase
 * (auth not yet `Ready`). Composes the brand mark, tagline, and the project
 * detection rows that previously lived in `BootstrapScreen`.
 */
export function BootstrapWelcome({ session }: BootstrapWelcomeProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Box marginTop={1} flexDirection="column">
        <Text bold color={theme.brand}>
          Novu Wizard
        </Text>
        <Text dimColor>Integrate Novu in minutes instead of hours.</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text bold>Project</Text>
        {renderDetectionRows(session)}
      </Box>
    </Box>
  );
}

function renderDetectionRows(session: WizardSession): React.ReactElement[] {
  const project = session.project;
  if (!project) {
    return [
      <Text key="loading" dimColor>
        {figures.ellipsis} Detecting…
      </Text>,
    ];
  }

  const installedNovuPackages = aggregateInstalledNovuPackages(project.topology.targets);
  const rows: { label: string; value: string }[] = [
    { label: 'Directory', value: project.cwd },
    { label: 'Workspaces', value: summariseTopology(project.topology) },
    { label: 'Package manager', value: project.packageManager },
    { label: 'TypeScript', value: project.hasTypeScript ? 'yes' : 'no' },
    {
      label: 'Existing @novu/* packages',
      value: installedNovuPackages.length ? installedNovuPackages.join(', ') : 'none',
    },
  ];

  return rows.map((row) => (
    <Box key={row.label} flexDirection="row" gap={1}>
      <Text color={theme.ok}>{figures.tick}</Text>
      <Text>
        {row.label}: <Text dimColor>{row.value}</Text>
      </Text>
    </Box>
  ));
}

function aggregateInstalledNovuPackages(targets: InstallTarget[]): string[] {
  const aggregated = new Set<string>();
  for (const target of targets) {
    for (const pkg of target.installedNovuPackages) aggregated.add(pkg);
  }

  return Array.from(aggregated).sort();
}
