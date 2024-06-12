import { PackageManager } from "../helpers/get-pkg-manager";

export type TemplateType =
  | "default"
  | "app"
  | "default-react-email"
  | "app-react-email";
export type TemplateMode = "js" | "ts";

export interface GetTemplateFileArgs {
  template: TemplateType;
  mode: TemplateMode;
  file: string;
}

export interface InstallTemplateArgs {
  appName: string;
  root: string;
  packageManager: PackageManager;
  isOnline: boolean;

  template: TemplateType;
  mode: TemplateMode;
  eslint: boolean;
  reactEmail: boolean;
  srcDir: boolean;
  importAlias: string;
  apiKey: string;
  tunnelHost: string;
}
