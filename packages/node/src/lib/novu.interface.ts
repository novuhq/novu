import { AxiosInstance } from 'axios';
import { ChannelTypeEnum } from '@novu/shared';

export interface INovuConfiguration {
  backendUrl?: string;
}

export interface IAttachmentOptions {
  mime: string;
  file: Buffer;
  name?: string;
  channels?: ChannelTypeEnum[];
}

export class WithHttp {
  protected readonly http: AxiosInstance;

  constructor(http: AxiosInstance) {
    this.http = http;
  }
}
