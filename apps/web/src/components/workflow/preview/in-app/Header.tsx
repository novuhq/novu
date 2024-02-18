import styled from '@emotion/styled';
import { colors } from '@novu/design-system';
import { InAppHeaderIcons, LocaleSelect } from '../common';

const LIGHT_THEME_BG = `linear-gradient(270deg, ${colors.B98} 0%, rgba(255, 255, 255, 0.00) 100%);`;
const DARK_THEME_BG = `linear-gradient(90deg, ${colors.B17} 0%, #24242d 48.44%, #292934 100%), #292933`;

export function Header({ selectedLocale, locales, areLocalesLoading, onLocaleChange }) {
  return (
    <ContainerStyled>
      <div
        style={{
          marginRight: 'auto',
        }}
      >
        <LocaleSelect
          isLoading={areLocalesLoading}
          locales={locales || []}
          onLocaleChange={onLocaleChange}
          value={selectedLocale}
        />
      </div>
      <InAppHeaderIcons />
    </ContainerStyled>
  );
}

const ContainerStyled = styled.div`
  display: flex;
  padding: 8px 12px;
  justify-content: flex-end;
  align-items: center;
  align-self: stretch;
  border-radius: 0px 8px 0px 0px;
  background: ${({ theme }) => (theme.colorScheme === 'dark' ? DARK_THEME_BG : LIGHT_THEME_BG)};
`;
