import { PackageManager } from "../helpers/get-pkg-manager";

export enum TemplateTypeEnum {
  DEFAULT = "default",
  APP = "app",
  DEFAULT_REACT_EMAIL = "default-react-email",
  APP_REACT_EMAIL = "app-react-email",
}

export type TemplateType = `${TemplateTypeEnum}`;
export type TemplateMode = "js" | "ts";

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface GetTemplateFileArgs {
  template: TemplateType;
  mode: TemplateMode;
  file: string;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface InstallTemplateArgs {
  appName: string;
  root: string;
  packageManager: PackageManager;
  isOnline: boolean;
  template: TemplateType;
  mode: TemplateMode;
  eslint: boolean;
  srcDir: boolean;
  importAlias: string;
  secretKey: string;
}
