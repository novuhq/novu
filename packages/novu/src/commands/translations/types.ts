export interface TranslationCommandOptions {
  secretKey: string;
  apiUrl: string;
  directory: string;
}

export interface MasterJsonResponse {
  data: Record<string, unknown>;
  locale: string;
}

export interface UploadResponseData {
  success: boolean;
  message: string;
  successful?: string[];
  failed?: string[];
}

export interface UploadResponse {
  data: UploadResponseData;
}

export interface OrganizationSettings {
  removeNovuBranding: boolean;
  defaultLocale: string;
  targetLocales: string[];
}

export interface OrganizationSettingsResponse {
  data: OrganizationSettings;
}

export interface TranslationFile {
  locale: string;
  filePath: string;
  content: Record<string, unknown>;
}
