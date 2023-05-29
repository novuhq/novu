import { ChannelTypeEnum } from '@novu/shared';
import { NovuProviderBase } from './NovuProviderBase';

export function NovuSmsProviderModal({ onClose }: { onClose: () => void }) {
  return <NovuProviderBase onClose={onClose} channel={ChannelTypeEnum.SMS} />;
}
