import { Grid, useMantineColorScheme } from '@mantine/core';
import { TemplatesSideBar } from '../../components/templates/TemplatesSideBar';
import styled from '@emotion/styled';
import { colors } from '../../design-system';
import { useTemplateController } from '../../components/templates/use-template-controller.hook';
import { TemplatePreference } from '../../components/templates/notification-setting-form/TemplatePreference';

export function UserPreference({ activePage, setActivePage, showErrors, templateId }) {
  const { colorScheme } = useMantineColorScheme();

  const { template, trigger } = useTemplateController(templateId);

  return (
    <div style={{ marginLeft: 12, marginRight: 12, padding: 17.5, minHeight: 500 }}>
      <Grid grow style={{ minHeight: 500 }}>
        <Grid.Col md={4} sm={6}>
          <SideBarWrapper dark={colorScheme === 'dark'} style={{ paddingRight: 50 }}>
            <TemplatesSideBar
              activeTab={activePage}
              changeTab={setActivePage}
              showTriggerSection={!!template && !!trigger}
              showErrors={showErrors}
            />
          </SideBarWrapper>
        </Grid.Col>

        <Grid.Col md={8} sm={6} style={{ position: 'relative' }}>
          <div style={{ paddingLeft: 23 }}>
            <TemplatePreference />
          </div>
        </Grid.Col>
      </Grid>
    </div>
  );
}

const SideBarWrapper = styled.div<{ dark: boolean }>`
  border-right: 1px solid ${({ dark }) => (dark ? colors.B20 : colors.BGLight)};
  height: 100%;
`;
