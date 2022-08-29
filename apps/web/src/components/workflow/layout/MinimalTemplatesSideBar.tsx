import React from 'react';
import styled from '@emotion/styled';
import { NavSection, TemplatesSideBar } from '../../templates/TemplatesSideBar';
import { ActivePageEnum } from '../../../pages/templates/editor/TemplateEditorPage';
import { WrapperButton } from '../../../design-system/template-button/Button';
import { IconWrapper } from '../../../design-system/template-button/IconWrapper';

export function MinimalTemplatesSideBar({
  activePage,
  setActivePage,
  showTriggerSection,
  showErrors,
}: {
  activePage: ActivePageEnum;
  setActivePage: (string) => void;
  showTriggerSection: boolean;
  showErrors: any;
}) {
  return (
    <Wrapper>
      <TemplatesSideBar
        activeTab={activePage}
        changeTab={setActivePage}
        showTriggerSection={showTriggerSection}
        showErrors={showErrors}
        minimalView={true}
      />
    </Wrapper>
  );
}

const Wrapper = styled.div`
  position: absolute;
  width: 100px;
  padding: 25px;
  z-index: 5;

  ${NavSection} {
    margin-bottom: 20px;
  }

  ${WrapperButton} {
    height: 50px;
    width: 50px;
    margin: 0;
  }

  ${IconWrapper} {
    margin-left: 0;
    @media screen and (max-width: 1400px) {
    }
  }
`;
