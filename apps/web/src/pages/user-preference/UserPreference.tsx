import { Grid, useMantineColorScheme } from '@mantine/core';
import styled from '@emotion/styled';

import { colors } from '../../design-system';
import { useTemplateEditor } from '../templates/components/TemplateEditorProvider';
import { TemplatesSideBar } from '../templates/components/TemplatesSideBar';
import { TemplatePreference } from '../templates/components/notification-setting-form/TemplatePreference';

export function UserPreference({ activePage, setActivePage }) {
  const { colorScheme } = useMantineColorScheme();
  const { template, trigger } = useTemplateEditor();

  return (
    <div style={{ marginLeft: 12, marginRight: 12, padding: 17.5, minHeight: 500 }}>
      <Grid grow style={{ minHeight: 500 }}>
        <Grid.Col md={4} sm={6}>
          <SideBarWrapper dark={colorScheme === 'dark'} style={{ paddingRight: 50 }}>
            <TemplatesSideBar
              activeTab={activePage}
              changeTab={setActivePage}
              showTriggerSection={!!template && !!trigger}
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
