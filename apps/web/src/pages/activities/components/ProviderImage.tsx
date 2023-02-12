import { useMantineColorScheme } from '@mantine/core';
import styled from '@emotion/styled';
import { providers } from '@novu/shared';
import { CONTEXT_PATH } from '../../../config';

export const ProviderImage = ({ providerId }: { providerId: string | undefined }) => {
  const { colorScheme } = useMantineColorScheme();
  if (!providerId) {
    return null;
  }
  const provider: any = providers.find((item: any) => item.id === providerId);

  if (!provider) {
    return null;
  }

  return (
    <Logo
      src={CONTEXT_PATH + `/static/images/providers/${colorScheme}/${provider.logoFileName[`${colorScheme}`]}`}
      alt={provider.displayName}
    />
  );
};

const Logo = styled.img`
  max-width: 140px;
  max-height: 20px;
`;
