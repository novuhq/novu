import figures from 'figures';
import { Box, Text } from 'ink';
import React from 'react';
import { LoadingBox } from '../primitives';
import { theme } from '../theme';
import type { WizardSession } from '../wizard-session';

const MAX_VISIBLE_SKILLS = 6;

export type SkillsPaneProps = {
  session: WizardSession;
};

/**
 * Right-pane content shown while the wizard is in `RunPhase.Skills`. While the
 * install is in flight (or zero skills resolved), shows a loader; otherwise
 * renders a short list of installed skills with their host badge and the most
 * recent status message as a hint.
 */
export function SkillsPane({ session }: SkillsPaneProps): React.ReactElement {
  const { installedSkills, skillsMessage } = session;
  const isInstalling = installedSkills.length === 0;

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color={theme.brand}>
        Installing Novu skills
      </Text>
      {isInstalling ? (
        <LoadingBox message="Fetching the latest Novu skill set…" color={theme.brand} />
      ) : (
        <SkillsList installedSkills={installedSkills} message={skillsMessage} />
      )}
    </Box>
  );
}

function SkillsList({
  installedSkills,
  message,
}: {
  installedSkills: WizardSession['installedSkills'];
  message?: string;
}): React.ReactElement {
  const visible = installedSkills.slice(0, MAX_VISIBLE_SKILLS);
  const remaining = installedSkills.length - visible.length;

  return (
    <Box flexDirection="column">
      {visible.map((skill) => (
        <Box key={`${skill.host}-${skill.name}`} flexDirection="row" gap={1}>
          <Text color={theme.ok}>{figures.tick}</Text>
          <Text>
            {skill.name} <Text dimColor>· {skill.host}</Text>
          </Text>
        </Box>
      ))}
      {remaining > 0 ? (
        <Text dimColor>
          {figures.ellipsis} +{remaining} more
        </Text>
      ) : null}
      {message ? (
        <Box marginTop={1}>
          <Text dimColor>{message}</Text>
        </Box>
      ) : null}
    </Box>
  );
}
