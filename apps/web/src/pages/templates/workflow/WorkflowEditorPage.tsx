import FlowEditor from '../../../components/workflow/FlowEditor';
import PageContainer from '../../../components/layout/components/PageContainer';
import PageHeader from '../../../components/layout/components/PageHeader';
import styled from '@emotion/styled';
import { colors, TemplateButton } from '../../../design-system';
import { Grid } from '@mantine/core';
import { MobileGradient } from '../../../design-system/icons';
import React from 'react';

const WorkflowEditorPage = () => {
  const onDragStart = (event, nodeType, data) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div style={{ marginLeft: 12, marginRight: 12, padding: 17.5, minHeight: 500 }}>
      <Grid grow style={{ minHeight: 500 }}>
        <Grid.Col md={8} sm={6}>
          <FlowEditor />
        </Grid.Col>
        <Grid.Col md={4} sm={6}>
          <SideBarWrapper dark={true}>
            <StyledNav>
              <NavSection
                onDragStart={(event) =>
                  onDragStart(event, 'channelNode', {
                    Icon: MobileGradient,
                    description: 'ddd',
                    label: 'In-App Content',
                  })
                }
                draggable
              >
                <TemplateButton
                  Icon={MobileGradient}
                  description={'ddd'}
                  label="In-App Content"
                  tabKey={'bla'}
                  changeTab={() => {}}
                />
              </NavSection>
            </StyledNav>
          </SideBarWrapper>
        </Grid.Col>
      </Grid>
    </div>
  );
};

export default WorkflowEditorPage;

const SideBarWrapper = styled.div<{ dark: boolean }>`
  border-right: 1px solid ${({ dark }) => (dark ? colors.B20 : colors.BGLight)};
  height: 100%;
`;

const StyledNav = styled.div`
  margin-bottom: 30px;
`;

const NavSection = styled.div``;
