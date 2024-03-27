import {
  IEmailBlock,
  ITemplateVariable,
  StepTypeEnum,
  IPreferenceChannels,
  DigestTypeEnum,
  DigestUnitEnum,
  DelayTypeEnum,
  ActorTypeEnum,
} from '@novu/shared';
import { NotificationTemplateEntity, StepFilter } from '@novu/dal';

interface IVariant {
  cta?: any;
  uuid?: string;
  active?: boolean;
  subject?: string;
  title?: string;
  contentType?: 'editor' | 'customHtml';
  preheader?: string;
  filters?: StepFilter[];
  content: string | IEmailBlock[];
  variables?: ITemplateVariable[];
  name?: string;
  type: StepTypeEnum;
  replyCallback?: {
    active: boolean;
    url: string;
  };
  metadata?: {
    amount?: number;
    unit?: DigestUnitEnum;
    digestKey?: string;
    type: DigestTypeEnum | DelayTypeEnum;
    backoff?: boolean;
    delayPath?: string;
    backoffUnit?: DigestUnitEnum;
    backoffAmount?: number;
    updateMode?: boolean;
  };
  actor?: {
    type: ActorTypeEnum;
    data: string | null;
  };
}

interface IStep extends IVariant {
  variants?: IStep[];
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface CreateTemplatePayload extends Omit<NotificationTemplateEntity, 'steps'> {
  noFeedId?: boolean;
  noLayoutId?: boolean;
  noGroupId?: boolean;
  preferenceSettingsOverride?: IPreferenceChannels;
  steps: IStep[];
}
