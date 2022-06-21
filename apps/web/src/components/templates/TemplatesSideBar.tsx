import { useMantineTheme } from '@mantine/core';
import { useFormContext } from 'react-hook-form';
import styled from '@emotion/styled';
import { colors, TemplateButton, Text } from '../../design-system';
import { BellGradient, ConnectGradient, TapeGradient } from '../../design-system/icons';
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
          errors={showErrors && (errors.name?.message || errors.notificationGroup?.message)}
        />
        <TemplateButton
          tabKey={ActivePageEnum.WORKFLOW}
          changeTab={changeTab}
          Icon={ConnectGradient}
          testId="workflowButton"
          active={activeTab === ActivePageEnum.WORKFLOW}
          description="Create multi-step workflows"
          label="Workflow Editor"
          errors={showErrors && getStepsErrors(errors)}
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

function getStepsErrors(errors: { [p: string]: string }) {
  const keys = Object.keys(errors);
  const channelErrors = keys.filter((key) => {
    return key.includes(`steps`);
  });

  return channelErrors.length > 0 && 'Something is missing here';
}

const StyledNav = styled.div`
  margin-bottom: 30px;
`;

const NavSection = styled.div``;
