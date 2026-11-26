import { type ChannelTypeEnum, EnvironmentTypeEnum, type IEnvironment } from '@novu/shared';
import { RiStarLine } from 'react-icons/ri';
import { CHANNEL_LABELS, channelNoun } from '../utils/helpers';
import { DrawerConfirmDialog } from './drawer-confirm-dialog';

/** "email", "push", but "SMS". */

/** "Production", "Production and Staging", "Production, Staging and Preview". */
function listNames(names: string[]) {
  if (names.length <= 1) return names.join('');

  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * The environments worth naming in the note: from a development environment, the live ones (where users get
 * notifications); from a live one, the others.
 */
function otherEnvironmentNames(environment: IEnvironment | undefined, environments: IEnvironment[]) {
  const others = environments.filter((env) => env._id !== environment?._id);
  const isLive = (env: IEnvironment) => env.type === EnvironmentTypeEnum.PROD;
  const named = environment && !isLive(environment) ? others.filter(isLive) : others;

  return named.map((env) => env.name);
}

type MakePrimaryModalProps = {
  isOpen: boolean;
  newPrimaryName: string;
  /** The integration that is primary now; it stays connected. */
  currentPrimaryName?: string;
  channel?: ChannelTypeEnum;
  /** The environment the integration is in. */
  environment?: IEnvironment;
  environments: IEnvironment[];
  /** A primary can't have routing conditions, so making it primary removes them. */
  removesConditions?: boolean;
  isLoading?: boolean;
  /** Centered on the manage drawer by default; `page` when opened from an integration card. */
  centerOn?: 'drawer' | 'page';
  onCancel: () => void;
  onConfirm: () => void;
};

/** Confirms handing the channel's primary over to this integration, in its environment only. */
export function MakePrimaryModal({
  isOpen,
  newPrimaryName,
  currentPrimaryName,
  channel,
  environment,
  environments,
  removesConditions,
  isLoading,
  centerOn,
  onCancel,
  onConfirm,
}: MakePrimaryModalProps) {
  const channelLabel = channel ? CHANNEL_LABELS[channel] : 'Channel';
  const where = environment ? ` in ${environment.name}` : '';
  const stays = currentPrimaryName ? ` ${currentPrimaryName} stays connected, so you can switch back any time.` : '';
  const conditions = removesConditions ? " Its routing conditions are removed, since a primary can't have any." : '';
  const others = otherEnvironmentNames(environment, environments);
  const note =
    others.length === 0
      ? undefined
      : others.length === 1
        ? `${others[0]} has its own primary. Switch it from the ${others[0]} environment if intended.`
        : `${listNames(others)} have their own primaries. Switch them from those environments if intended.`;

  return (
    <DrawerConfirmDialog
      isOpen={isOpen}
      icon={<RiStarLine className="size-[18px]" />}
      iconTileClassName="bg-bg-weak border-stroke-soft text-text-strong border"
      title={`Make ${newPrimaryName} your primary ${channelNoun(channel)} provider?`}
      description={`${channelLabel} steps${where} will send through ${newPrimaryName} from now on.${stays}${conditions}`}
      note={note}
      cancelLabel="Cancel"
      confirmLabel="Make primary"
      confirmVariant="primary"
      isLoading={isLoading}
      className="w-[440px]"
      centerOn={centerOn}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
