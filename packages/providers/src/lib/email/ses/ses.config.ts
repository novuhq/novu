export interface SESConfig {
  from: string;
  region: string;
  senderName: string;
  accessKeyId: string;
  secretAccessKey: string;
  configurationSetName?: string;
}
