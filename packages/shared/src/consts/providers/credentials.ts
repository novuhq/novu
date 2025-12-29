export * from './credentials/index';

import { IConfigCredentials } from './provider.interface';
import { CredentialsKeyEnum } from '../../types';

export const mailForwarderConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.MAIL_FORWARDER_BUCKET,
    displayName: 'GCS Bucket Name',
    required: true,
    type: 'text',
  },
  {
    key: CredentialsKeyEnum.GCP_PROJECT_ID,
    displayName: 'GCP Project ID',
    required: true,
    type: 'text',
  },
  {
    key: CredentialsKeyEnum.GCP_SERVICE_ACCOUNT_KEY_PATH,
    displayName: 'Service Account Key Path',
    required: false,
    type: 'text',
  },
  {
    key: CredentialsKeyEnum.SERVICE_ACCOUNT_IDENTITY,
    displayName: 'Service Account Identity',
    required: true,
    type: 'text',
  },
  {
    key: CredentialsKeyEnum.SENDER_EMAIL,
    displayName: 'Sender Email',
    required: false,
    type: 'text',
  },
  {
    key: CredentialsKeyEnum.SenderName,
    displayName: 'Sender Name',
    required: false,
    type: 'text',
  },
  {
    key: CredentialsKeyEnum.DEFAULT_FROM,
    displayName: 'Default From Address',
    required: false,
    type: 'text',
  },
];
