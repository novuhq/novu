import styled from '@emotion/styled';
import { Avatar, Indicator } from '@mantine/core';
import { ProvidersIdEnum } from '@novu/shared';
import { ProviderMissing } from '../../../design-system/icons';

type DisplayPrimaryProviderIconProps = {
  isChannelStep: boolean;
  providerIntegration?: ProvidersIdEnum;
  logoSrc?: string;
  disabledProp: any;
  Icon: React.FC<any>;
};

export function DisplayPrimaryProviderIcon({
  isChannelStep,
  providerIntegration,
  logoSrc,
  disabledProp,
  Icon,
}: DisplayPrimaryProviderIconProps) {
  if (isChannelStep) {
    return (
      <Indicator
        label={<Icon width="16px" height="16px" {...disabledProp} />}
        position="bottom-end"
        size={16}
        offset={providerIntegration ? 8 : 4}
        inline
      >
        <AvatarWrapper>
          {providerIntegration ? (
            <Avatar src={logoSrc} size={32} radius={0} color="white" />
          ) : (
            <Avatar radius="xl">
              <ProviderMissing {...disabledProp} width="32px" height="32px" />
            </Avatar>
          )}
        </AvatarWrapper>
      </Indicator>
    );
  } else {
    return (
      <AvatarWrapper>
        <Icon {...disabledProp} width="32px" height="32px" />
      </AvatarWrapper>
    );
  }
}

const AvatarWrapper = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4px;
`;
