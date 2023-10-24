import { createStyles } from '@mantine/core';
import styled from '@emotion/styled';

import { colors, MadeByNovu } from '@novu/design-system';

export const ModalBodyHolder = styled.div`
  display: flex;
  height: 100%;
`;

export const TemplatesSidebarHolder = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 200px;
  padding: 6px;
  background-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B20 : colors.BGLight)};
  overflow-y: auto;
`;

export const TemplatesGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const GroupItem = styled.div`
  padding: 10px;
`;

export const GroupName = styled(GroupItem)`
  font-weight: 700;
  font-size: 16px;
  line-height: 20px;
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B60 : colors.B80)};
`;

export const TemplateItem = styled(GroupItem)`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: normal;
  line-height: 20px;
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.white : colors.B60)};
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.25s ease;

  > i {
    font-size: 16px;
  }

  &:hover {
    text-shadow: 0px 0px 1px currentColor;
    color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.white : colors.B15)};
    background-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B30 : colors.white)};
  }
`;

export const TemplatesDetailsHolder = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  padding: 16px;
`;

export const TemplateHeader = styled.div`
  display: flex;
  gap: 10px;
`;

export const TemplateDetails = styled.div`
  display: flex;
  flex-direction: column;
`;

export const TemplateName = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  line-height: 20px;
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.white : colors.B60)};

  > i {
    font-size: 18px;
  }
`;

export const CanvasHolder = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  width: 100%;
  height: 100%;
`;

export const NovuButtonHolder = styled.div`
  position: absolute;
  bottom: 4px;
  right: 4px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

export const MadeByNovuStyled = styled(MadeByNovu)`
  color: ${colors.B60};
`;

export const TemplateDescription = styled.p`
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.white : colors.B40)};
`;

export const useStyles = createStyles((theme) => ({
  inner: {
    alignItems: 'center',
  },
  modal: {
    padding: '0 !important',
    backgroundColor: theme.colorScheme === 'dark' ? colors.B15 : colors.B98,
    overflow: 'hidden',
    width: '62vw',
    height: '72vh',
    maxWidth: 1200,
    minHeight: 520,
    maxHeight: 1000,
  },
  body: {
    height: '100%',
  },
}));
