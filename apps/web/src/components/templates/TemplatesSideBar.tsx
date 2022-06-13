import { useMantineTheme } from '@mantine/core';
import { useFormContext } from 'react-hook-form';
import styled from '@emotion/styled';
import { colors, TemplateButton, Text } from '../../design-system';
import { BellGradient, TapeGradient } from '../../design-system/icons';
import { ActivePageEnum } from '../../pages/templates/editor/TemplateEditorPage';

export function TemplatesSideBar({
  activeTab,
  changeTab,
  showTriggerSection = false,
  showErrors,
}: {
  activeTab: string;
  changeTab: (string) => void;
  showTriggerSection: boolean;
  showErrors: boolean;
}) {
  const {
    formState: { errors },
  } = useFormContext();

  const theme = useMantineTheme();
  const textColor = theme.colorScheme === 'dark' ? colors.B40 : colors.B70;

  return (
    <StyledNav>
      <NavSection>
        <TemplateButton
          tabKey={ActivePageEnum.SETTINGS}
          changeTab={changeTab}
          Icon={BellGradient}
          testId="settingsButton"
          active={activeTab === ActivePageEnum.SETTINGS}
          description="Configure cross-channel notification settings"
          label="Notification Settings"
          errors={showErrors && (errors.name || errors.notificationGroup)}
        />
        <TemplateButton
          tabKey={ActivePageEnum.WORKFLOW}
          changeTab={changeTab}
          Icon={BellGradient}
          testId="workflowButton"
          active={activeTab === ActivePageEnum.WORKFLOW}
          description="Configure cross-channel notification settings"
          label="Workflow Editor"
          errors={showErrors && (errors.name || errors.notificationGroup)}
        />
      </NavSection>
      {showTriggerSection && (
        <NavSection>
          <Text mt={10} mb={20} color={textColor}>
            Implementation Code
          </Text>
          <div>
            <TemplateButton
              tabKey={ActivePageEnum.TRIGGER_SNIPPET}
              changeTab={changeTab}
              Icon={TapeGradient}
              testId="triggerCodeSelector"
              active={activeTab === ActivePageEnum.TRIGGER_SNIPPET}
              description="Get your notification trigger code snippet"
              label="Trigger Snippet"
            />
          </div>
        </NavSection>
      )}
    </StyledNav>
  );
}

function getChannelErrors(channel: 'sms' | 'email' | 'inApp', errors: { [p: string]: string }) {
  const keys = Object.keys(errors);
  const channelErrors = keys.filter((key) => {
    return key.includes(`${channel}Messages`);
  });

  return channelErrors.map((key) => errors[key]).toString();
}

const StyledNav = styled.div`
  margin-bottom: 30px;
`;

const NavSection = styled.div``;
